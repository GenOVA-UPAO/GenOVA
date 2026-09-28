"""Núcleo de dominio de RAG: chunking, fusión RRF y ensamblado de contexto (puro)."""

from rag.domain.chunking import chunk_text, chunks_needed
from rag.domain.context import build_contexto_usuario
from rag.domain.fusion import reciprocal_rank_fusion, sanitize_websearch_query

__all__ = [
    "build_contexto_usuario",
    "chunks_needed",
    "chunk_text",
    "reciprocal_rank_fusion",
    "sanitize_websearch_query",
]
