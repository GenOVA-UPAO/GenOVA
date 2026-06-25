"""Top-k cosine retrieval over pgvector."""

from __future__ import annotations

import logging
import os
from collections.abc import Sequence

from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from rag.embedder import EmbedderError, get_embedder
from rag.store import _vec_literal

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
DEFAULT_MAX_CONTEXT_CHARS = int(os.getenv("RAG_MAX_CONTEXT_CHARS", "6000"))

# Simple in-memory cache: (query_string, tuple_of_upload_ids) -> list[dict]
_retrieval_cache: dict[tuple[str, tuple[str, ...]], list[dict]] = {}
_MAX_RETRIEVAL_CACHE = 100


def top_k(
    db: Session,
    query: str,
    upload_ids: Sequence[str],
    k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """Return the top-k chunks from the given uploads ranked by cosine
    similarity to `query`. Returns an empty list (not raises) on any failure —
    callers should treat RAG as best-effort."""
    if not upload_ids or not query.strip():
        return []

    cache_key = (query.strip(), tuple(sorted(upload_ids)))
    if cache_key in _retrieval_cache:
        logger.info("RAG retrieval cache hit for query=%r", query[:60])
        return _retrieval_cache[cache_key]

    try:
        embedder = get_embedder()
        # Prefer embed_query (RETRIEVAL_QUERY task_type) if available; some
        # backends only expose embed_batch.
        if hasattr(embedder, "embed_query"):
            emb = embedder.embed_query(query)  # type: ignore[attr-defined]
        else:
            emb = embedder.embed_batch([query])[0]
    except EmbedderError:
        logger.exception("Embedder unavailable; returning empty RAG context.")
        return []
    except Exception:
        logger.exception("Embedding query failed; returning empty RAG context.")
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
        LIMIT :k
        """
    ).bindparams(bindparam("upload_ids", expanding=True))
    try:
        rows = (
            db.execute(
                stmt,
                {
                    "q": _vec_literal(emb),
                    "upload_ids": [str(u) for u in upload_ids],
                    "k": k,
                },
            )
            .mappings()
            .all()
        )
    except Exception:
        logger.exception("pgvector retrieval failed; returning empty.")
        return []

    result = [dict(r) for r in rows]
    if len(_retrieval_cache) >= _MAX_RETRIEVAL_CACHE:
        _retrieval_cache.pop(next(iter(_retrieval_cache)))
    _retrieval_cache[cache_key] = result
    return result


def build_contexto_usuario(
    chunks: list[dict],
    max_chars: int = DEFAULT_MAX_CONTEXT_CHARS,
) -> str:
    """Format retrieved chunks as a prompt-injection block. Returns "" if no
    chunks (callers should then omit the entire block from the prompt)."""
    if not chunks:
        return ""
    parts: list[str] = []
    total = 0
    for c in chunks:
        snippet = (c.get("content") or "").strip()
        if not snippet:
            continue
        header = f"[Fuente: {c.get('source_filename', '?')}]"
        block = f"{header}\n{snippet}"
        if total + len(block) > max_chars and parts:
            break
        parts.append(block)
        total += len(block) + 4
    if not parts:
        return ""
    return "\n---\n".join(parts)
