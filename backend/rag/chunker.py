"""Sliding-window chunker. No external deps."""
from __future__ import annotations

import os
import re

DEFAULT_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "800"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
MAX_CHUNKS_PER_FILE = int(os.getenv("RAG_MAX_CHUNKS_PER_FILE", "100"))


def _normalize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
    max_chunks: int = MAX_CHUNKS_PER_FILE,
) -> list[str]:
    """Sliding-window chunker. Slices at character boundaries. Skips empty
    chunks. Hard-caps at `max_chunks` to bound embedding cost per upload."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")

    cleaned = _normalize(text)
    if not cleaned:
        return []

    chunks: list[str] = []
    step = chunk_size - overlap
    for start in range(0, len(cleaned), step):
        piece = cleaned[start : start + chunk_size].strip()
        if piece:
            chunks.append(piece)
        if len(chunks) >= max_chunks:
            break
    return chunks
