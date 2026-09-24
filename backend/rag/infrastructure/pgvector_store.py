"""pgvector persistence layer for RAG chunks.

We use raw SQL because SQLAlchemy doesn't ship a vector type out of the box.
The `embedding` column is stored as a `vector(768)` literal — we serialize
Python lists to the `[v1,v2,...]` syntax pgvector accepts.

Recuperación híbrida (EN RAG): rama vectorial (HNSW, coseno) + rama léxica
(tsvector 'spanish' + websearch_to_tsquery) fusionadas por Reciprocal Rank
Fusion (rag.domain.fusion, lógica pura). Cada rama falla independientemente a
[] — el RAG sigue siendo best-effort.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

import structlog
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from rag.domain.fusion import reciprocal_rank_fusion, sanitize_websearch_query

logger = structlog.get_logger(__name__)

DEFAULT_TTL_SECONDS = 3600  # untied chunks expire after 1 h
_HNSW_EF_SEARCH = 40  # defecto de pgvector; fijado explícito para plan predecible
_LEXICAL_CANDIDATES = 20  # candidatos por rama antes de fusionar (RRF)


def _vec_literal(vec: Sequence[float]) -> str:
    """Serialize a float vector to pgvector's text format: [v1,v2,v3,...]"""
    return "[" + ",".join(f"{float(x):.7f}" for x in vec) + "]"


def insert_chunks(
    db: Session,
    *,
    user_id: UUID | str,
    upload_id: UUID | str,
    source_filename: str,
    chunks: list[str],
    embeddings: list[list[float]],
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> int:
    """Bulk-insert chunks. Returns count inserted. Raises ValueError on
    chunk/embedding length mismatch."""
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings must be the same length")
    if not chunks:
        return 0

    expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)

    rows = []
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings, strict=True)):
        rows.append(
            {
                "user_id": str(user_id),
                "upload_id": str(upload_id),
                "source_filename": source_filename,
                "chunk_index": i,
                "content": chunk,
                "embedding": _vec_literal(emb),
                "expires_at": expires_at,
            }
        )

    stmt = text(
        """
        INSERT INTO rag_chunks
            (user_id, upload_id, source_filename, chunk_index, content, embedding, expires_at)
        VALUES
            (:user_id, :upload_id, :source_filename, :chunk_index, :content,
             CAST(:embedding AS vector), :expires_at)
        """
    )
    db.execute(stmt, rows)
    db.commit()
    return len(rows)


def tie_uploads_to_ova(db: Session, upload_ids: Sequence[str], ova_id: str) -> int:
    """Mark all chunks from these upload_ids as belonging to a generated OVA.
    Tied chunks never expire automatically (kept until the OVA is deleted)."""
    if not upload_ids:
        return 0
    stmt = text(
        """
        UPDATE rag_chunks
        SET ova_id = CAST(:ova_id AS UUID)
        WHERE upload_id::text IN :upload_ids
        """
    ).bindparams(bindparam("upload_ids", expanding=True))
    result = db.execute(
        stmt,
        {"ova_id": ova_id, "upload_ids": [str(u) for u in upload_ids]},
    )
    db.commit()
    return result.rowcount or 0


def upload_ids_for_ova(db: Session, ova_id: str) -> list[str]:
    """Documentos ligados a un OVA (los de su creación y los adjuntados después en
    el chat del editor). Falla a [] sin lanzar: el RAG es best-effort."""
    stmt = text(
        """
        SELECT DISTINCT upload_id::text AS upload_id
        FROM rag_chunks
        WHERE ova_id = CAST(:ova_id AS UUID)
        """
    )
    try:
        return [r[0] for r in db.execute(stmt, {"ova_id": str(ova_id)}).all()]
    except Exception:
        logger.exception("No se pudieron leer los documentos del OVA", ova_id=str(ova_id))
        db.rollback()
        return []


def owned_upload_ids(db: Session, user_id: str, upload_ids: Sequence[str]) -> list[str]:
    """Subconjunto de `upload_ids` con chunks del usuario. Sin este filtro, quien
    conociera el id de un documento ajeno podía recuperar su contenido."""
    if not upload_ids:
        return []
    stmt = text(
        """
        SELECT DISTINCT upload_id::text AS upload_id
        FROM rag_chunks
        WHERE user_id = CAST(:user_id AS UUID) AND upload_id::text IN :upload_ids
        """
    ).bindparams(bindparam("upload_ids", expanding=True))
    try:
        rows = db.execute(
            stmt, {"user_id": str(user_id), "upload_ids": [str(u) for u in upload_ids]}
        ).all()
    except Exception:
        logger.exception("No se pudo comprobar la propiedad de los documentos")
        db.rollback()
        return []
    owned = {r[0] for r in rows}
    return [str(u) for u in upload_ids if str(u) in owned]


def purge_expired(db: Session) -> int:
    """Delete untied chunks past their expiry. Called at startup and optionally
    from a cron-style task."""
    stmt = text(
        """
        DELETE FROM rag_chunks
        WHERE ova_id IS NULL AND expires_at < now()
        """
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount or 0


def chunks_for_upload(db: Session, upload_id: str) -> list[dict]:
    """Debug helper: return all chunks for an upload (without embeddings)."""
    stmt = text(
        """
        SELECT id::text, chunk_index, source_filename, content
        FROM rag_chunks
        WHERE upload_id = CAST(:upload_id AS UUID)
        ORDER BY chunk_index
        """
    )
    rows = db.execute(stmt, {"upload_id": upload_id}).mappings().all()
    return [dict(r) for r in rows]


def search(
    db: Session,
    query_embedding: list[float],
    upload_ids: Sequence[str],
    k: int,
) -> list[dict]:
    """Top-k por similitud coseno sobre los chunks de esos uploads. Devuelve []
    (no lanza) ante cualquier fallo — el RAG es best-effort.

    Compatibilidad: envoltorio fino de la rama vectorial del modo híbrido.
    """
    if not upload_ids:
        return []
    rows = _fetch_vector(db, query_embedding, upload_ids, k)
    return rows


def _fetch_vector(
    db: Session,
    query_embedding: list[float],
    upload_ids: Sequence[str],
    candidate_k: int,
) -> list[dict]:
    """Rama vectorial: top-N por coseno (HNSW). Falla a [] sin lanzar."""
    if not upload_ids or not query_embedding:
        return []
    stmt = text(
        """
        SELECT id::text,
               upload_id::text,
               source_filename,
               chunk_index,
               content,
               1 - (embedding <=> CAST(:q AS vector)) AS score
        FROM rag_chunks
        WHERE upload_id::text IN :upload_ids
        ORDER BY embedding <=> CAST(:q AS vector)
        LIMIT :ck
        """
    ).bindparams(bindparam("upload_ids", expanding=True))
    try:
        # SET no acepta parámetros enlazados en PostgreSQL; constante interna.
        db.execute(text(f"SET hnsw.ef_search = {int(_HNSW_EF_SEARCH)}"))
        rows = (
            db.execute(
                stmt,
                {
                    "q": _vec_literal(query_embedding),
                    "upload_ids": [str(u) for u in upload_ids],
                    "ck": candidate_k,
                },
            )
            .mappings()
            .all()
        )
    except Exception:
        logger.exception("Fallo en retrieval vectorial de pgvector; rama vacía")
        return []
    return [dict(r) for r in rows]


def _fetch_lexical(
    db: Session,
    query_text: str,
    upload_ids: Sequence[str],
    candidate_k: int,
) -> list[dict]:
    """Rama léxica: tsvector 'spanish' + websearch_to_tsquery. Falla a []."""
    clean = sanitize_websearch_query(query_text)
    if not clean or not upload_ids:
        return []
    stmt = text(
        """
        SELECT id::text,
               upload_id::text,
               source_filename,
               chunk_index,
               content
        FROM rag_chunks, websearch_to_tsquery('spanish', :query_text) AS q
        WHERE upload_id::text IN :upload_ids
          AND content_tsv @@ q
        ORDER BY ts_rank(content_tsv, q) DESC
        LIMIT :ck
        """
    ).bindparams(bindparam("upload_ids", expanding=True))
    try:
        rows = (
            db.execute(
                stmt,
                {
                    "query_text": clean,
                    "upload_ids": [str(u) for u in upload_ids],
                    "ck": candidate_k,
                },
            )
            .mappings()
            .all()
        )
    except Exception:
        logger.exception("Fallo en retrieval léxico de pgvector; rama vacía")
        return []
    return [dict(r) for r in rows]


def search_hybrid(
    db: Session,
    query_text: str,
    query_embedding: list[float] | None,
    upload_ids: Sequence[str],
    k: int,
    candidate_k: int = _LEXICAL_CANDIDATES,
) -> list[dict]:
    """Recuperación híbrida con RRF: rama vectorial + rama léxica.

    Cada rama devuelve hasta ``candidate_k`` candidatos (más de los ``k`` que
    se devuelven) y rag.domain.fusion los fusiona por consenso de rangos.
    Una rama que falla no tumba a la otra; si ambas fallan, [] (best-effort).
    """
    if not upload_ids:
        return []
    vector_rows = _fetch_vector(db, query_embedding, upload_ids, candidate_k) if query_embedding else []
    lexical_rows = _fetch_lexical(db, query_text, upload_ids, candidate_k)
    if not vector_rows and not lexical_rows:
        return []

    fused_ids = reciprocal_rank_fusion(
        [[r["id"] for r in vector_rows], [r["id"] for r in lexical_rows]]
    )[:k]
    by_id: dict[str, dict] = {}
    for r in lexical_rows:
        by_id[r["id"]] = r
    for r in vector_rows:  # el score vectorial manda si el id está en ambas
        by_id[r["id"]] = r
    return [by_id[i] for i in fused_ids if i in by_id]


class PgVectorChunkStore:
    """Adaptador que implementa ChunkStorePort sobre una sesión SQLAlchemy."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def insert_chunks(
        self,
        *,
        user_id: UUID | str,
        upload_id: UUID | str,
        source_filename: str,
        chunks: list[str],
        embeddings: list[list[float]],
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> int:
        return insert_chunks(
            self._db,
            user_id=user_id,
            upload_id=upload_id,
            source_filename=source_filename,
            chunks=chunks,
            embeddings=embeddings,
            ttl_seconds=ttl_seconds,
        )

    def search(
        self, query_embedding: list[float], upload_ids: Sequence[str], k: int
    ) -> list[dict]:
        return search(self._db, query_embedding, upload_ids, k)

    def search_hybrid(
        self,
        query_text: str,
        query_embedding: list[float] | None,
        upload_ids: Sequence[str],
        k: int,
        candidate_k: int = _LEXICAL_CANDIDATES,
    ) -> list[dict]:
        return search_hybrid(
            self._db, query_text, query_embedding, upload_ids, k, candidate_k
        )

    def tie_uploads_to_ova(self, upload_ids: Sequence[str], ova_id: str) -> int:
        return tie_uploads_to_ova(self._db, upload_ids, ova_id)

    def purge_expired(self) -> int:
        return purge_expired(self._db)

    def chunks_for_upload(self, upload_id: str) -> list[dict]:
        return chunks_for_upload(self._db, upload_id)
