"""Caso de uso: exportar la versión activa de una OVA en el formato pedido.

`scorm12` delega en `ExportScorm` (sirve el paquete guardado al generar). El resto
de formatos se construye al vuelo a partir de las fases de la versión activa.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from core.educational_metadata import metadata_from_ova
from ova.application.dto import ExportOvaInput, ManageOvaInput, PackageDownload
from ova.application.ports import ExportFormatSpec, OvaEditorRepository, OvaLifecycleRepository
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

    def execute(self, data: ExportOvaInput) -> PackageDownload:
        fmt = self.find_format(data.format)
        if fmt is None:
            raise OvaEditError(
                400, "unknown_format", f"Formato de exportación no soportado: {data.format}"
            )
        if fmt.id == STORED_FORMAT:
            return self.export_scorm.execute(ManageOvaInput(ova_id=data.ova_id, actor=data.actor))

        ova = self.ovas.get_active(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("Sin permisos.")
        if ova.status != "listo":
            raise OvaEditError(409, "ova_not_ready", "El OVA no está listo.")
        active = self.editor.get_active_version(data.ova_id)
        if active is None:
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
        content = fmt.build(ova.title, phases, metadata=metadata_from_ova(ova))
        filename = f"{scorm_filename_stem(ova.title)}_v{active.version_number}.{fmt.extension}"
        return PackageDownload(
            kind="bytes", filename=filename, content=content, media_type=fmt.media_type
        )
