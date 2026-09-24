"""Dominio RAG (arquitectura hexagonal).

Superficie pública estable de funciones para los consumidores que aún reciben la
`Session` por parámetro (`llm`, `prometheus`, `generation`, `ova`, `uploads`).
Cuando esos dominios migren, deberían pasar a los casos de uso vía
`rag.container.build_rag`.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

import structlog
from sqlalchemy.orm import Session

from rag.application.errors import EmbedderError
from rag.application.use_cases import IngestDocument, RetrieveChunks
from rag.config import is_enabled
from rag.domain.chunking import chunk_text
from rag.domain.context import (
    build_contexto_usuario,
    select_context_chunks,
    sources_in_context,
    summarize_sources,
)
from rag.infrastructure.embedders import get_embedder, vector_dim
from rag.infrastructure.orm import RagChunk
from rag.infrastructure.parsers import FileTextExtractor
from rag.infrastructure.pgvector_store import (
    PgVectorChunkStore,
    chunks_for_upload,
    insert_chunks,
    owned_upload_ids,
    purge_expired,
    tie_uploads_to_ova,
    upload_ids_for_ova,
)

logger = structlog.get_logger(__name__)


def top_k(db: Session, query: str, upload_ids: Sequence[str], k: int | None = None) -> list[dict]:
    from rag.application.use_cases.retrieve_chunks import DEFAULT_TOP_K

    store = PgVectorChunkStore(db)
    return RetrieveChunks(get_embedder(), store).execute(
        query, upload_ids, DEFAULT_TOP_K if k is None else k
    )


@dataclass(frozen=True, slots=True)
class RetrievedContext:
    """Bloque de contexto listo para el prompt y de qué archivos salió.

    `sources` solo cuenta los fragmentos que entraron en el bloque (los que el
    presupuesto de caracteres deja fuera no se consultaron de verdad)."""

    contexto: str = ""
    sources: list[dict] = field(default_factory=list)

    @property
    def chunks(self) -> int:
        return sum(int(s.get("chunks", 0)) for s in self.sources)


def context_from_chunks(chunks: list[dict]) -> RetrievedContext:
    selected = select_context_chunks(chunks)
    return RetrievedContext(build_contexto_usuario(selected), summarize_sources(selected))


def retrieve_context(
    db: Session,
    query: str,
    upload_ids: Sequence[str],
    *,
    user_id: str | None = None,
    k: int | None = None,
) -> RetrievedContext:
    """Punto único de recuperación para los consumidores (concierge, routers de
    fase, regeneración): respeta `RAG_DISABLED`, filtra por dueño si se pasa
    `user_id` y nunca lanza (el RAG es best-effort)."""
    if not is_enabled() or not upload_ids or not query.strip():
        return RetrievedContext()
    try:
        ids = owned_upload_ids(db, user_id, upload_ids) if user_id else list(upload_ids)
        return context_from_chunks(top_k(db, query, ids, k) if ids else [])
    except Exception:  # noqa: BLE001 — el RAG nunca tumba la generación
        logger.exception("RAG: fallo al recuperar contexto; se sigue sin anclaje")
        return RetrievedContext()


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
    "RetrievedContext",
    "build_contexto_usuario",
    "chunk_text",
    "chunks_for_upload",
    "context_from_chunks",
    "get_embedder",
    "ingest_upload",
    "insert_chunks",
    "is_enabled",
    "owned_upload_ids",
    "purge_expired",
    "retrieve_context",
    "sources_in_context",
    "tie_uploads_to_ova",
    "top_k",
    "upload_ids_for_ova",
    "vector_dim",
]
