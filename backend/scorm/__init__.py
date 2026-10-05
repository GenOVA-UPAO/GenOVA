"""Dominio SCORM (arquitectura hexagonal — dominio puro).

API pública: `build_scorm_zip_bytes`, `DEFAULT_PHASES` y el registro de formatos de
exportación (`EXPORT_FORMATS`, `get_export_format`, `build_export`).
Router de health: `scorm.interface.http.router`.
"""

from scorm.domain import (
    DEFAULT_EXPORT_FORMAT,
    DEFAULT_PHASES,
    EXPORT_FORMATS,
    ExportFormat,
    UnknownExportFormat,
    build_export,
    build_scorm_zip_bytes,
    get_export_format,
)

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
