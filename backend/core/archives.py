"""Límites de descompresión para documentos Office (DOCX/PPTX son zips).

El tope de subida mide bytes comprimidos: un zip de pocos KB puede declarar
cientos de MB de miembros, y python-pptx los lee TODOS en memoria al abrirlo
(python-docx, los referenciados). Se mira solo la tabla central del zip (los
tamaños declarados; zipfile no deja leer más de lo declarado) sin descomprimir
nada. Puro stdlib: lo usan la validación de subidas y los parsers del RAG.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
MAX_MEMBERS = 2000
MAX_RATIO = 200
# Por debajo de este tamaño un miembro no cuenta para el ratio: el XML vacío o
# repetitivo de un documento legítimo comprime muchísimo.
_RATIO_MIN_BYTES = 1024 * 1024


def office_zip_within_limits(source: bytes | str | Path) -> bool:
    """True si el zip es válido y descomprimido no excede los límites."""
    try:
        target = io.BytesIO(source) if isinstance(source, bytes) else source
        with zipfile.ZipFile(target) as archive:
            members = archive.infolist()
    except (zipfile.BadZipFile, OSError, ValueError):
        return False
    if len(members) > MAX_MEMBERS:
        return False
    if sum(m.file_size for m in members) > MAX_UNCOMPRESSED_BYTES:
        return False
    return not any(
        m.file_size > _RATIO_MIN_BYTES and m.file_size / max(m.compress_size, 1) > MAX_RATIO
        for m in members
    )
