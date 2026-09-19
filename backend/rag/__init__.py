"""Dominio RAG (arquitectura hexagonal).

Superficie pública estable de funciones para los consumidores que aún reciben la
`Session` por parámetro (`llm`, `prometheus`, `generation`, `ova`, `uploads`).
Cuando esos dominios migren, deberían pasar a los casos de uso vía
`rag.container.build_rag`.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy.orm import Session

from rag.application.errors import EmbedderError
from rag.application.use_cases import IngestDocument, RetrieveChunks
from rag.config import is_enabled
from rag.domain.chunking import chunk_text
from rag.domain.context import build_contexto_usuario
from rag.infrastructure.embedders import get_embedder, vector_dim
from rag.infrastructure.orm import RagChunk
from rag.infrastructure.parsers import FileTextExtractor
from rag.infrastructure.pgvector_store import (
    PgVectorChunkStore,
    chunks_for_upload,
    insert_chunks,
    purge_expired,
    tie_uploads_to_ova,
)


def top_k(db: Session, query: str, upload_ids: Sequence[str], k: int | None = None) -> list[dict]:
    from rag.application.use_cases.retrieve_chunks import DEFAULT_TOP_K

    store = PgVectorChunkStore(db)
    return RetrieveChunks(get_embedder(), store).execute(
        query, upload_ids, DEFAULT_TOP_K if k is None else k
    )


def ingest_upload(
    db: Session, *, user_id: str, upload_id: str, storage_path: str, filename: str
) -> dict:
    store = PgVectorChunkStore(db)
    use_case = IngestDocument(get_embedder(), store, FileTextExtractor())
    return use_case.execute(
        user_id=user_id, upload_id=upload_id, storage_path=storage_path, filename=filename
    )


__all__ = [
    "EmbedderError",
    "RagChunk",
    "build_contexto_usuario",
    "chunk_text",
    "chunks_for_upload",
    "get_embedder",
    "ingest_upload",
    "insert_chunks",
    "is_enabled",
    "purge_expired",
    "tie_uploads_to_ova",
    "top_k",
    "vector_dim",
]
