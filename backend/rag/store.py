"""pgvector persistence layer for RAG chunks.

We use raw SQL because SQLAlchemy doesn't ship a vector type out of the box.
The `embedding` column is stored as a `vector(768)` literal — we serialize
Python lists to the `[v1,v2,...]` syntax pgvector accepts.
"""
from __future__ import annotations

import logging
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 3600  # untied chunks expire after 1 h


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
