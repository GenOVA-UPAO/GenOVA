"""Casos de uso: listar y revertir micro-versiones de una fase."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import PhaseVersionInput
from ova.application.ports import OvaEditorRepository
from ova.domain.editor import EditorMicroVersion
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound


@dataclass(frozen=True, slots=True)
class PhaseVersions:
    repo: OvaEditorRepository

    def list(self, data: PhaseVersionInput) -> dict:
        ova = self.repo.get_ova(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != data.actor.id:
            raise OvaForbidden("Sin permisos.")
        return {
            "phase_id": data.phase_id,
            "micro_versions": [
                _micro_dict(item) for item in self.repo.list_micro_versions(data.phase_id, data.ova_id)
            ],
        }

    def revert(self, data: PhaseVersionInput) -> dict:
        ova = self.repo.get_ova(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != data.actor.id:
            raise OvaForbidden("Sin permisos.")
        micro = self.repo.get_micro_version(data.micro_version_id, data.phase_id)
        if micro is None:
            raise OvaEditError(404, "not_found", "Micro-versión no encontrada.")
        active = self.repo.get_or_create_active_version(ova)
        if self.repo.get_phase(data.phase_id, active.id) is None:
            raise OvaEditError(
                404,
                "phase_not_found",
                "Fase no encontrada en versión activa.",
            )
        self.repo.set_phase_content(data.phase_id, micro.content)
        self.repo.record_micro_version(data.phase_id, data.ova_id, micro.content)
        self.repo.commit("revert_phase_version")
        return {
            "message": f"Fase revertida a micro-versión {micro.minor_number}.",
            "minor_number": micro.minor_number,
        }


def _micro_dict(item: EditorMicroVersion) -> dict:
    return {
        "id": item.id,
        "minor_number": item.minor_number,
        "content": item.content,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }
