"""Comprime las imágenes generadas antes de meterlas en el recurso.

Los modelos devuelven PNG sin comprimir (Gemini Flash Image: ~1,4 MB por
imagen) que viajan en base64 dentro del HTML y del paquete SCORM: un cómic con
dos viñetas pesaba casi 3 MB. En WebP (calidad 80, lado máximo 1024 px) quedan en
unas decenas o cientos de KB sin diferencia visible en pantalla.
"""

from __future__ import annotations

import base64
import io
import re

import structlog

logger = structlog.get_logger(__name__)

MAX_SIDE = 1024
QUALITY = 80
_DATA_URI = re.compile(r"^data:(image/(?:png|jpeg|jpg|webp));base64,(.+)$", re.DOTALL)


def compress_data_uri(uri: str | None) -> str | None:
    """WebP más ligero de `uri`, o `uri` tal cual si no es un raster o no mejora.

    Los SVG (Recraft vector, placeholders) y cualquier cosa que no se pueda
    decodificar pasan sin tocar: comprimir nunca debe romper una imagen.
    """
    match = _DATA_URI.match(uri or "")
    if not match:
        return uri
    try:
        from PIL import Image

        raw = base64.b64decode(match.group(2))
        with Image.open(io.BytesIO(raw)) as img:
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            out = io.BytesIO()
            img.save(out, format="WEBP", quality=QUALITY, method=4)
        packed = out.getvalue()
    except Exception as exc:
        logger.warning("image compression skipped", error_type=type(exc).__name__)
        return uri
    if len(packed) >= len(raw):
        return uri
    return "data:image/webp;base64," + base64.b64encode(packed).decode("ascii")
