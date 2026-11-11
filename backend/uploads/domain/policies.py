"""Políticas puras del dominio de subidas: tipos permitidos y verificación de firma."""

from __future__ import annotations

from pathlib import Path

import filetype

from core.archives import office_zip_within_limits

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
        # filetype >= 1.1 reconoce el tipo Office concreto (no solo el zip): antes
        # solo se aceptaba "application/zip" y todo DOCX/PPTX real se rechazaba
        # como «El contenido del archivo no coincide con su tipo declarado».
        return sniffed in (declared_mime, "application/zip")
    if declared_mime == "application/pdf":
        return sniffed == "application/pdf"
    if declared_mime.startswith("image/"):
        return sniffed is not None and sniffed.startswith("image/")
    if declared_mime.startswith("audio/"):
        return sniffed is not None and (
            sniffed.startswith("audio/") or sniffed in _AUDIO_CONTAINER_MIMES
        )
    return False


def office_archive_ok(declared_mime: str, content: bytes) -> bool:
    """DOCX/PPTX son zips: rechaza los que descomprimidos exceden los límites
    (zip bomb). El tope de subida solo mide los bytes comprimidos."""
    return declared_mime not in _OFFICE_ZIP_MIMES or office_zip_within_limits(content)


# El archivo se guarda en disco como `<uuid>_<nombre>`: con 37 bytes de prefijo
# el nombre debe caber holgado en NAME_MAX (255 bytes). Un título largo en
# UTF-8 (tildes = 2 bytes) lo superaba y open() fallaba con un 500.
_MAX_NAME_BYTES = 150
_MAX_SUFFIX_BYTES = 16


def _truncate_utf8(text: str, max_bytes: int) -> str:
    return text.encode("utf-8")[:max_bytes].decode("utf-8", errors="ignore")


def safe_filename(raw: str | None) -> str:
    """Nombre apto para disco: sin ruta, sin NUL ni caracteres de control y con
    el nombre acotado en bytes conservando la extensión (la ingesta la usa para
    detectar el tipo)."""
    name = "".join(c for c in Path(raw or "archivo").name if c.isprintable()).strip()
    name = name or "archivo"
    if len(name.encode("utf-8")) <= _MAX_NAME_BYTES:
        return name
    suffix = Path(name).suffix
    if len(suffix.encode("utf-8")) > _MAX_SUFFIX_BYTES:
        suffix = ""
    stem = name[: len(name) - len(suffix)] if suffix else name
    budget = _MAX_NAME_BYTES - len(suffix.encode("utf-8"))
    return _truncate_utf8(stem, budget) + suffix


_INGESTION_MESSAGES: dict[str, str] = {
    "unsupported_type": "Este tipo de archivo no se puede leer como texto: no se usará como contexto.",
    "empty_text": "No se encontró texto en el archivo (¿es un escaneo o una imagen?): no se usará "
    "como contexto.",
    "no_chunks": "No se encontró texto en el archivo: no se usará como contexto.",
    "parse_error": "No se pudo leer el contenido del archivo: no se usará como contexto.",
    "embedder_error": "El servicio de indexado falló al procesar el archivo: no se usará como "
    "contexto. Prueba a subirlo de nuevo.",
    "embedder_unavailable": "El servicio de indexado no está disponible ahora: el archivo no se "
    "usará como contexto.",
    "db_error": "No se pudo guardar el índice del archivo: no se usará como contexto.",
}


def ingestion_message(status: str, reason: str | None) -> str | None:
    """Motivo legible de una ingesta que no dejó el archivo listo para el RAG."""
    if status in ("indexed", "processing", "disabled"):
        return None
    return _INGESTION_MESSAGES.get(
        reason or "", "El archivo se subió pero no pudo indexarse: no se usará como contexto."
    )
