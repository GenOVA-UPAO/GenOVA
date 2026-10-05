"""Registro de formatos de exportación de una OVA.

Cada formato tiene un id fijo (compartido con el frontend), extensión, media type
y un builder puro `(course_title, module_title, phases) -> bytes`. Todos parten de
los mismos recursos por fase (`scorm.domain.resources.prepare_phase_resources`).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from functools import partial

from core.educational_metadata import EducationalMetadata
from scorm.domain.formats.elpx import build_elpx_bytes
from scorm.domain.formats.epub import build_epub_bytes
from scorm.domain.formats.h5p import build_h5p_bytes
from scorm.domain.package import build_shell_zip_bytes

DEFAULT_EXPORT_FORMAT = "scorm12"
DEFAULT_MODULE_TITLE = "OVA Generado por GenOVA"

PackageBuilder = Callable[..., bytes]


class UnknownExportFormat(ValueError):
    def __init__(self, format_id: str) -> None:
        super().__init__(f"Formato de exportación no soportado: {format_id}")
        self.format_id = format_id


@dataclass(frozen=True, slots=True)
class ExportFormat:
    id: str
    label: str
    extension: str  # sin punto
    media_type: str
    builder: PackageBuilder

    def build(
        self,
        course_title: str,
        phases: list[dict] | None,
        module_title: str = DEFAULT_MODULE_TITLE,
        *,
        metadata: EducationalMetadata | None = None,
        theme: str = "upao",
    ) -> bytes:
        return self.builder(course_title, module_title, phases, metadata=metadata, theme=theme)


EXPORT_FORMATS: dict[str, ExportFormat] = {
    fmt.id: fmt
    for fmt in (
        ExportFormat(
            "scorm12",
            "SCORM 1.2",
            "zip",
            "application/zip",
            partial(build_shell_zip_bytes, "scorm12"),
        ),
        ExportFormat(
            "scorm2004",
            "SCORM 2004",
            "zip",
            "application/zip",
            partial(build_shell_zip_bytes, "scorm2004"),
        ),
        ExportFormat(
            "ims",
            "IMS Content Package",
            "zip",
            "application/zip",
            partial(build_shell_zip_bytes, "ims"),
        ),
        ExportFormat(
            "html",
            "Web (HTML)",
            "zip",
            "application/zip",
            partial(build_shell_zip_bytes, "html"),
        ),
        ExportFormat("epub", "EPUB 3", "epub", "application/epub+zip", build_epub_bytes),
        ExportFormat("elpx", "eXeLearning", "elpx", "application/zip", build_elpx_bytes),
        ExportFormat("h5p", "H5P", "h5p", "application/zip", build_h5p_bytes),
    )
}


def get_export_format(format_id: str) -> ExportFormat | None:
    return EXPORT_FORMATS.get((format_id or "").strip().lower())


def build_export(
    format_id: str,
    course_title: str,
    phases: list[dict] | None,
    module_title: str = DEFAULT_MODULE_TITLE,
    *,
    metadata: EducationalMetadata | None = None,
    theme: str = "upao",
) -> bytes:
    fmt = get_export_format(format_id)
    if fmt is None:
        raise UnknownExportFormat(format_id)
    return fmt.build(course_title, phases, module_title, metadata=metadata, theme=theme)


__all__ = [
    "DEFAULT_EXPORT_FORMAT",
    "EXPORT_FORMATS",
    "ExportFormat",
    "UnknownExportFormat",
    "build_export",
    "get_export_format",
]
