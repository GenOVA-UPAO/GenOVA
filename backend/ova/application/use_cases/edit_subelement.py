"""Caso de uso: editar un subelemento granular de una fase."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import SubelementEditInput
from ova.application.ports import OvaEditorRepository
from ova.domain.editor import SUBELEMENT_SUPPORTED_TYPES
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound


@dataclass(frozen=True, slots=True)
class EditSubelement:
    repo: OvaEditorRepository

    def execute(self, data: SubelementEditInput) -> None:
        ova = self.repo.get_ova(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != data.actor.id:
            raise OvaForbidden("Sin permisos.")
        active = self.repo.get_active_version(data.ova_id)
        if active is None:
            raise OvaEditError(404, "no_version", "Sin versión activa.")
        phase = self.repo.get_phase(data.phase_id, active.id)
        if phase is None:
            raise OvaEditError(404, "phase_not_found", "Fase no encontrada.")
        if phase.phase_type not in SUBELEMENT_SUPPORTED_TYPES:
            raise OvaEditError(
                501,
                "not_supported",
                f"La edición granular no está disponible para la fase '{phase.phase_type}' aún.",
            )
        raise OvaEditError(501, "not_implemented", "Edición granular en desarrollo.")
