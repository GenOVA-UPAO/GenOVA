"""Caso de uso: exportar la versión activa de una OVA en el formato pedido.

Los formatos se construyen desde la versión activa para reflejar el tema vigente.
Solo una OVA antigua sin versión activa recurre al SCORM almacenado.

Cada fase lleva, si los tiene, los datos estructurados con que se generó
(`phase["activity"]`), para que H5P y eXeLearning la exporten como actividad
editable. Se buscan por la huella del HTML actual de la fase: si el docente lo editó
ya no coincide y la fase se exporta como HTML (datos desincronizados).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from core.educational_metadata import metadata_from_ova
from core.text import content_hash
from ova.application.dto import ExportOvaInput, ManageOvaInput, PackageDownload
from ova.application.ports import (
    ExportFormatSpec,
    OvaEditorRepository,
    OvaLifecycleRepository,
    ResourceActivityRepository,
)
from ova.application.use_cases.export_scorm import ExportScorm
from ova.domain.editor import scorm_filename_stem
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound

STORED_FORMAT = "scorm12"


@dataclass(frozen=True, slots=True)
class ExportPackage:
    ovas: OvaLifecycleRepository
    editor: OvaEditorRepository
    export_scorm: ExportScorm
    find_format: Callable[[str], ExportFormatSpec | None]
    activities: ResourceActivityRepository | None = None

    def execute(self, data: ExportOvaInput) -> PackageDownload:
        fmt = self.find_format(data.format)
        if fmt is None:
            raise OvaEditError(
                400, "unknown_format", f"Formato de exportación no soportado: {data.format}"
            )
        ova = self.ovas.get_active(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("Sin permisos.")
        if ova.status != "listo":
            raise OvaEditError(409, "ova_not_ready", "El OVA no está listo.")
        active = self.editor.get_active_version(data.ova_id)
        if active is None:
            if fmt.id == STORED_FORMAT and ova.package_theme == "upao":
                return self.export_scorm.execute(ManageOvaInput(ova_id=data.ova_id, actor=data.actor))
            raise OvaEditError(404, "version_not_found", "La OVA no tiene una versión activa.")

        phases = [
            {
                "type": phase.phase_type,
                "order": phase.phase_order,
                "content": phase.content,
                "title": phase.title,
            }
            for phase in self.editor.list_phases(active.id)
        ]
        self._attach_activities(phases)
        content = fmt.build(ova.title, phases, metadata=metadata_from_ova(ova), theme=ova.package_theme)
        filename = f"{scorm_filename_stem(ova.title)}_v{active.version_number}.{fmt.extension}"
        return PackageDownload(
            kind="bytes", filename=filename, content=content, media_type=fmt.media_type
        )

    def _attach_activities(self, phases: list[dict]) -> None:
        if self.activities is None or not phases:
            return
        hashes = [content_hash(phase["content"]) for phase in phases]
        found = self.activities.find_by_hashes(tuple(dict.fromkeys(hashes)))
        for phase, sha in zip(phases, hashes, strict=True):
            if sha in found:
                phase["activity"] = found[sha]
