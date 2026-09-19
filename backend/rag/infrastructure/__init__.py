"""Adaptadores de salida del dominio RAG (pgvector, embedders, parsers)."""

from rag.infrastructure.embedders import EmbedderError, get_embedder, vector_dim
from rag.infrastructure.orm import RagChunk
from rag.infrastructure.parsers import FileTextExtractor
from rag.infrastructure.pgvector_store import (
    PgVectorChunkStore,
    chunks_for_upload,
    insert_chunks,
    purge_expired,
    tie_uploads_to_ova,
)

__all__ = [
    "EmbedderError",
    "FileTextExtractor",
    "PgVectorChunkStore",
    "RagChunk",
    "chunks_for_upload",
    "get_embedder",
    "insert_chunks",
    "purge_expired",
    "tie_uploads_to_ova",
    "vector_dim",
]
