"""Núcleo de dominio de SCORM: ensamblado puro de los paquetes exportables.

Sin persistencia ni orquestación: `build_scorm_zip_bytes` (SCORM 1.2) y el registro
de formatos (`scorm.domain.formats`: SCORM 2004, IMS CP, HTML, EPUB 3, eXeLearning)
toman los datos del OVA y devuelven los bytes del paquete (en memoria). Por eso
este dominio no tiene capas `application`/`infrastructure` ni `container` — no hay
nada que abstraer ni inyectar.
"""

from scorm.domain.formats import (
    DEFAULT_EXPORT_FORMAT,
    EXPORT_FORMATS,
    ExportFormat,
    UnknownExportFormat,
    build_export,
    get_export_format,
)
from scorm.domain.package import build_scorm_zip_bytes
from scorm.domain.resources import DEFAULT_PHASES

__all__ = [
    "DEFAULT_EXPORT_FORMAT",
    "DEFAULT_PHASES",
    "EXPORT_FORMATS",
    "ExportFormat",
    "UnknownExportFormat",
    "build_export",
    "build_scorm_zip_bytes",
    "get_export_format",
]
