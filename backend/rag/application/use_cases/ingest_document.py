"""Caso de uso: ingesta end-to-end de un archivo subido (parse -> chunk -> embed -> persist).

Best-effort: nunca lanza. Devuelve un dict de estado apto para la respuesta de la
subida (`rag_status`).
"""

from __future__ import annotations

import mimetypes
from dataclasses import dataclass
from pathlib import Path

import structlog

from rag.application.errors import EmbedderError, ParserError
from rag.application.ports import ChunkStorePort, EmbedderPort, TextExtractorPort
from rag.domain.chunking import MAX_CHUNKS_PER_FILE, chunk_text, chunks_needed

logger = structlog.get_logger(__name__)

_MULTIMODAL_KINDS = {"pdf", "image", "audio", "video"}
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


@dataclass(frozen=True, slots=True)
class IngestDocument:
    embedder: EmbedderPort
    store: ChunkStorePort
    extractor: TextExtractorPort

    def execute(
        self, *, user_id: str, upload_id: str, storage_path: str, filename: str
    ) -> dict:
        kind = self.extractor.detect_kind(filename)
        if not kind:
            return {"status": "skipped", "reason": "unsupported_type", "chunks": 0}
        if kind in _MULTIMODAL_KINDS:
            mime = _guess_mime(storage_path) or "application/octet-stream"
            return self._ingest_binary(user_id, upload_id, filename, storage_path, mime)
        return self._ingest_via_text(user_id, upload_id, filename, storage_path)

    def _ingest_via_text(
        self, user_id: str, upload_id: str, filename: str, storage_path: str
    ) -> dict:
        try:
            text = self.extractor.extract_text(storage_path, filename=filename)
        except ParserError as exc:
            logger.warning("RAG parse falló", filename=filename, error=str(exc))
            return {"status": "failed", "reason": "parse_error", "chunks": 0}
        if not text or not text.strip():
            return {"status": "skipped", "reason": "empty_text", "chunks": 0}
        return self._ingest_text(user_id, upload_id, filename, text)

    def _ingest_text(self, user_id: str, upload_id: str, filename: str, text: str) -> dict:
        chunks = chunk_text(text)
        if not chunks:
            return {"status": "skipped", "reason": "no_chunks", "chunks": 0}
        # El tope MAX_CHUNKS_PER_FILE recorta el documento en silencio; exponer
        # el aviso (viaja en `rag_status.message` a la respuesta de la subida).
        expected = chunks_needed(text)
        message = (
            f"Documento truncado: {len(chunks)} de {expected} fragmentos indexados "
            f"(tope RAG_MAX_CHUNKS_PER_FILE={MAX_CHUNKS_PER_FILE}). "
            "El resto del documento no está disponible para el RAG."
            if expected > len(chunks)
            else None
        )
        embeddings = self._embed_batch(chunks, filename)
        if embeddings is None:
            return {"status": "failed", "reason": "embedder_error", "chunks": 0}
        return self._persist(user_id, upload_id, filename, chunks, embeddings, message)

    def _ingest_binary(
        self, user_id: str, upload_id: str, filename: str, storage_path: str, mime_type: str
    ) -> dict:
        embed_file = getattr(self.embedder, "embed_file", None)
        if not getattr(self.embedder, "supports_multimodal", False) or not callable(embed_file):
            return self._ingest_via_text(user_id, upload_id, filename, storage_path)
        try:
            with open(storage_path, "rb") as fh:
                embedding = embed_file(fh.read(), mime_type)
        except EmbedderError as exc:
            logger.warning("RAG multimodal embed no disponible", filename=filename, error=str(exc))
            return {"status": "failed", "reason": "embedder_unavailable", "chunks": 0}
        except Exception:
            logger.exception("RAG multimodal embed falló", filename=filename)
            return {"status": "failed", "reason": "embedder_error", "chunks": 0}
        content = self._describe(storage_path, filename, mime_type)
        result = self._persist(user_id, upload_id, filename, [content], [embedding])
        if result.get("status") == "indexed":
            result["mode"] = "multimodal"
        return result

    def _describe(self, storage_path: str, filename: str, mime_type: str) -> str:
        try:
            text = self.extractor.extract_text(storage_path, filename=filename)
            return text if text.strip() else f"[Archivo multimodal: {filename} ({mime_type})]"
        except Exception as exc:  # noqa: BLE001
            logger.warning("RAG extract_text falló para multimodal", filename=filename, error=str(exc))
            return f"[Archivo multimodal: {filename} ({mime_type})]"

    def _embed_batch(self, chunks: list[str], filename: str) -> list[list[float]] | None:
        try:
            return self.embedder.embed_batch(chunks)
        except EmbedderError as exc:
            logger.warning("RAG embedding no disponible", filename=filename, error=str(exc))
            return None
        except Exception:
            logger.exception("RAG embedding falló", filename=filename)
            return None

    def _persist(
        self,
        user_id: str,
        upload_id: str,
        filename: str,
        chunks: list[str],
        embeddings: list[list[float]],
        message: str | None = None,
    ) -> dict:
        try:
            inserted = self.store.insert_chunks(
                user_id=user_id,
                upload_id=upload_id,
                source_filename=filename,
                chunks=chunks,
                embeddings=embeddings,
            )
        except Exception:
            logger.exception("RAG insert falló", filename=filename)
            return {"status": "failed", "reason": "db_error", "chunks": 0}
        result = {"status": "indexed", "chunks": inserted}
        if message:
            result["message"] = message
            logger.warning(
                "RAG documento truncado por tope de chunks",
                filename=filename,
                chunks=len(chunks),
                expected=message,
            )
        return result
