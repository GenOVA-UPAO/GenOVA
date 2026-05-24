"""End-to-end ingestion: parse → chunk → embed → persist. Best-effort:
RAG ingestion never blocks the upload response (failures are logged + reported
in the response body as `rag_status`).

With `gemini-embedding-2-preview` (multimodal), file types supported natively
by the embedder (PDF, image, audio, video) skip parsing/chunking and produce
ONE embedding per file. Text formats (DOCX, PPTX) still go through
parser→chunker→embed_batch path because Gemini Embedding 2 doesn't accept
those MIME types directly.
"""
from __future__ import annotations

import logging
import mimetypes
import os
from pathlib import Path

from sqlalchemy.orm import Session

from rag.chunker import chunk_text
from rag.embedder import EmbedderError, get_embedder
from rag.parsers import ParserError, detect_kind, extract_text
from rag.store import insert_chunks

logger = logging.getLogger(__name__)


# MIME types Gemini Embedding 2 accepts directly as binary input.
_MULTIMODAL_KINDS = {"pdf", "image", "audio", "video"}

# Common extensions → MIME type map for kinds that aren't in
# mimetypes.guess_type() reliably across platforms.
_MIME_OVERRIDES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
}


def _guess_mime(path: str) -> str | None:
    ext = Path(path).suffix.lower()
    if ext in _MIME_OVERRIDES:
        return _MIME_OVERRIDES[ext]
    mime, _ = mimetypes.guess_type(path)
    return mime


def _ingest_text(
    db: Session,
    *,
    user_id: str,
    upload_id: str,
    filename: str,
    text: str,
) -> dict:
    """Chunk + embed text content (path for DOCX/PPTX and fallback)."""
    chunks = chunk_text(text)
    if not chunks:
        return {"status": "skipped", "reason": "no_chunks", "chunks": 0}
    try:
        embeddings = get_embedder().embed_batch(chunks)
    except EmbedderError as exc:
        logger.warning("RAG embedding unavailable for %s: %s", filename, exc)
        return {"status": "failed", "reason": "embedder_unavailable", "chunks": 0}
    except Exception:
        logger.exception("RAG embedding failed for %s", filename)
        return {"status": "failed", "reason": "embedder_error", "chunks": 0}

    try:
        inserted = insert_chunks(
            db,
            user_id=user_id,
            upload_id=upload_id,
            source_filename=filename,
            chunks=chunks,
            embeddings=embeddings,
        )
    except Exception:
        logger.exception("RAG insert failed for %s", filename)
        return {"status": "failed", "reason": "db_error", "chunks": 0}
    return {"status": "indexed", "chunks": inserted}


def _ingest_binary(
    db: Session,
    *,
    user_id: str,
    upload_id: str,
    filename: str,
    storage_path: str,
    mime_type: str,
) -> dict:
    """Embed a binary file (PDF/image/audio/video) as a single chunk via the
    multimodal embedder. Falls back to text extraction if the embedder doesn't
    support multimodal input."""
    embedder = get_embedder()
    if not getattr(embedder, "supports_multimodal", False) or not hasattr(embedder, "embed_file"):
        # Fallback: parse to text and chunk normally.
        try:
            text = extract_text(storage_path, filename=filename)
        except ParserError as exc:
            logger.warning("RAG parse failed for %s: %s", filename, exc)
            return {"status": "failed", "reason": "parse_error", "chunks": 0}
        return _ingest_text(db, user_id=user_id, upload_id=upload_id, filename=filename, text=text)

    try:
        with open(storage_path, "rb") as f:
            data = f.read()
        embedding = embedder.embed_file(data, mime_type)  # type: ignore[attr-defined]
    except EmbedderError as exc:
        logger.warning("RAG multimodal embed unavailable for %s: %s", filename, exc)
        return {"status": "failed", "reason": "embedder_unavailable", "chunks": 0}
    except Exception:
        logger.exception("RAG multimodal embed failed for %s", filename)
        return {"status": "failed", "reason": "embedder_error", "chunks": 0}

    # We still store the chunk row so retrieval can surface this file with its
    # filename as the only "content" anchor. The vector carries the semantic load.
    placeholder_text = f"[Archivo multimodal: {filename} ({mime_type})]"
    try:
        inserted = insert_chunks(
            db,
            user_id=user_id,
            upload_id=upload_id,
            source_filename=filename,
            chunks=[placeholder_text],
            embeddings=[embedding],
        )
    except Exception:
        logger.exception("RAG multimodal insert failed for %s", filename)
        return {"status": "failed", "reason": "db_error", "chunks": 0}
    return {"status": "indexed", "chunks": inserted, "mode": "multimodal"}


def ingest_upload(
    db: Session,
    *,
    user_id: str,
    upload_id: str,
    storage_path: str,
    filename: str,
) -> dict:
    """Run the RAG pipeline on a freshly uploaded file. Returns a status dict
    suitable for inclusion in the upload response. Never raises."""
    kind = detect_kind(filename)
    if not kind:
        return {"status": "skipped", "reason": "unsupported_type", "chunks": 0}

    # Route binary multimodal inputs to the direct-embed path.
    if kind in _MULTIMODAL_KINDS:
        mime = _guess_mime(storage_path) or "application/octet-stream"
        return _ingest_binary(
            db,
            user_id=user_id,
            upload_id=upload_id,
            filename=filename,
            storage_path=storage_path,
            mime_type=mime,
        )

    # Text formats: extract → chunk → embed.
    try:
        text = extract_text(storage_path, filename=filename)
    except ParserError as exc:
        logger.warning("RAG parse failed for %s: %s", filename, exc)
        return {"status": "failed", "reason": "parse_error", "chunks": 0}
    if not text or not text.strip():
        return {"status": "skipped", "reason": "empty_text", "chunks": 0}
    return _ingest_text(db, user_id=user_id, upload_id=upload_id, filename=filename, text=text)


def is_enabled() -> bool:
    """Quick check used by routers to decide whether to attempt ingestion at all."""
    return os.getenv("RAG_DISABLED", "").lower() not in ("1", "true", "yes")
