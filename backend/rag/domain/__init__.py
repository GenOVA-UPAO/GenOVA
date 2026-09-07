"""Núcleo de dominio de RAG: chunking y ensamblado de contexto (puro)."""

from rag.domain.chunking import chunk_text
from rag.domain.context import build_contexto_usuario

__all__ = ["build_contexto_usuario", "chunk_text"]
