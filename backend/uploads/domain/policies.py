"""Políticas puras del dominio de subidas: tipos permitidos y verificación de firma."""

from __future__ import annotations

from pathlib import Path

import filetype

ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {
        # Documentos
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        # Audio — transcrito con Whisper (cap free-tier Groq ~25 MB)
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
        "audio/webm",
        # Imágenes — analizadas con modelo de visión
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    }
)

_OFFICE_ZIP_MIMES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}
_AUDIO_CONTAINER_MIMES = {"video/mp4", "video/webm"}


def is_allowed_mime(mime: str) -> bool:
    return mime in ALLOWED_MIME_TYPES


def magic_bytes_ok(declared_mime: str, content: bytes) -> bool:
    """Defensa en profundidad: el content_type lo envía el cliente y es falsificable.
    Confirmamos la firma real (magic bytes) para bloquear archivos disfrazados."""
    kind = filetype.guess(content)
    sniffed = kind.mime if kind else None
    if declared_mime in _OFFICE_ZIP_MIMES:
        return sniffed == "application/zip"
    if declared_mime == "application/pdf":
        return sniffed == "application/pdf"
    if declared_mime.startswith("image/"):
        return sniffed is not None and sniffed.startswith("image/")
    if declared_mime.startswith("audio/"):
        return sniffed is not None and (
            sniffed.startswith("audio/") or sniffed in _AUDIO_CONTAINER_MIMES
        )
    return False


def safe_filename(raw: str | None) -> str:
    return Path(raw or "archivo").name
