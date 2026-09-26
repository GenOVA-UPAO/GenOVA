"""Acceso a pgvector para reindexar fragmentos (implementa ReindexStorePort).

Separado de `pgvector_store` porque solo lo usa el mantenimiento
(`scripts/reindex_rag.py`), no la ingesta ni la recuperación.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from rag.infrastructure.pgvector_store import _vec_literal

# `:upload_id` NULL = todos los documentos.
_COUNT = text(
    """
    SELECT embedding_model, count(*) AS n
    FROM rag_chunks
    WHERE CAST(:upload_id AS UUID) IS NULL OR upload_id = CAST(:upload_id AS UUID)
    GROUP BY embedding_model
    """
)
# Paginación por id (keyset): estable en el ensayo, que no actualiza nada.
_STALE = text(
    """
    SELECT id::text AS id, content
    FROM rag_chunks
    WHERE embedding_model IS DISTINCT FROM :fp
      AND (CAST(:after AS UUID) IS NULL OR id > CAST(:after AS UUID))
      AND (CAST(:upload_id AS UUID) IS NULL OR upload_id = CAST(:upload_id AS UUID))
    ORDER BY id
    LIMIT :n
    """
)
_UPDATE = text(
    """
    UPDATE rag_chunks
    SET embedding = CAST(:emb AS vector), embedding_model = :fp
    WHERE id = CAST(:id AS UUID)
    """
)


class PgVectorReindexStore:
    def __init__(self, db: Session) -> None:
        self._db = db

    def count_by_embedding_model(self, *, upload_id: str | None = None) -> dict[str | None, int]:
        rows = self._db.execute(_COUNT, {"upload_id": upload_id}).all()
        return {r[0]: int(r[1]) for r in rows}

    def stale_chunks(
        self, fingerprint: str, *, after_id: str | None, limit: int, upload_id: str | None = None
    ) -> list[dict]:
        params = {"fp": fingerprint, "after": after_id, "n": limit, "upload_id": upload_id}
        return [dict(r) for r in self._db.execute(_STALE, params).mappings().all()]

    def update_embeddings(self, rows: list[tuple[str, list[float]]], fingerprint: str) -> int:
        if not rows:
            return 0
        params = [{"id": cid, "emb": _vec_literal(vec), "fp": fingerprint} for cid, vec in rows]
        try:
            self._db.execute(_UPDATE, params)
            self._db.commit()  # por lote: si se corta, lo hecho queda hecho
        except Exception:
            self._db.rollback()
            raise
        return len(rows)
