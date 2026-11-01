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
from rag.domain.context import sanitize_source_filename

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

    def _ingest_text(
        self,
        user_id: str,
        upload_id: str,
        filename: str,
        text: str,
        file_vector: list[float] | None = None,
    ) -> dict:
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
        if file_vector is not None:
            # El vector multimodal del archivo va en una fila extra con el primer
            # fragmento como contenido: nunca el texto entero.
            chunks, embeddings = [*chunks, chunks[0]], [*embeddings, file_vector]
        return self._persist(user_id, upload_id, filename, chunks, embeddings, message)

    def _ingest_binary(
        self, user_id: str, upload_id: str, filename: str, storage_path: str, mime_type: str
    ) -> dict:
        """PDF/audio/imagen con embedder multimodal.

        El texto extraído pasa por el mismo troceo que `_ingest_text` (fragmentos
        acotados y aviso de truncado): guardarlo como UN chunk metía el PDF o la
        transcripción enteros en cada prompt. El embedding del archivo es un
        extra best-effort; si falla (p. ej. PDF de más páginas de las que admite
        el proveedor) el documento se indexa igual por su texto.
        """
        embed_file = getattr(self.embedder, "embed_file", None)
        if not getattr(self.embedder, "supports_multimodal", False) or not callable(embed_file):
            return self._ingest_via_text(user_id, upload_id, filename, storage_path)
        vector, reason = self._embed_file(embed_file, storage_path, mime_type, filename)
        text = self._extract_quietly(storage_path, filename)
        if text.strip():
            result = self._ingest_text(user_id, upload_id, filename, text, file_vector=vector)
        elif vector is None:
            return {"status": "failed", "reason": reason, "chunks": 0}
        else:
            placeholder = f"[Archivo multimodal: {sanitize_source_filename(filename)} ({mime_type})]"
            result = self._persist(user_id, upload_id, filename, [placeholder], [vector])
        if result.get("status") == "indexed" and vector is not None:
            result["mode"] = "multimodal"
        return result

    def _embed_file(
        self, embed_file, storage_path: str, mime_type: str, filename: str
    ) -> tuple[list[float] | None, str]:
        try:
            with open(storage_path, "rb") as fh:
                return embed_file(fh.read(), mime_type), ""
        except EmbedderError as exc:
            logger.warning("RAG multimodal embed no disponible", filename=filename, error=str(exc))
            return None, "embedder_unavailable"
        except Exception:
            logger.exception("RAG multimodal embed falló", filename=filename)
            return None, "embedder_error"

    def _extract_quietly(self, storage_path: str, filename: str) -> str:
        try:
            return self.extractor.extract_text(storage_path, filename=filename) or ""
        except Exception as exc:  # noqa: BLE001
            logger.warning("RAG extract_text falló para multimodal", filename=filename, error=str(exc))
            return ""

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
                embedding_model=getattr(self.embedder, "fingerprint", None),
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
