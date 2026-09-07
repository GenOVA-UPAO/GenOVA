"""Caso de uso para añadir un recurso a una fase de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import AddPhaseInput
from ova.application.ports import OvaEditorRepository
from ova.domain.editor import MAX_PHASES_PER_TYPE, EditorPhase, placeholder_content
from ova.domain.errors import OvaEditError, OvaForbidden, OvaGenerating, OvaNotFound


@dataclass(frozen=True, slots=True)
class AddPhase:
    repo: OvaEditorRepository

    def execute(self, data: AddPhaseInput) -> EditorPhase:
        phase_type = data.phase_type.strip()
        if not phase_type:
            raise OvaEditError(400, "invalid_type", "El tipo de fase no puede estar vacío.")
        prompt = data.prompt.strip()
        if not prompt:
            raise OvaEditError(400, "prompt_required", "El prompt no puede estar vacío.")
        ova = self.repo.get_ova(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        # Este endpoint históricamente solo autorizaba al propietario, no al admin.
        if ova.owner_id != data.actor.id:
            raise OvaForbidden("Sin permisos.")
        if ova.status == "generando":
            raise OvaGenerating("No se puede editar mientras genera.")
        version = self.repo.get_or_create_active_version(ova)
        if self.repo.count_phases(version.id, data.phase_type) >= MAX_PHASES_PER_TYPE:
            raise OvaEditError(
                422,
                "max_phases_reached",
                f"La fase '{data.phase_type}' ya tiene el máximo de {MAX_PHASES_PER_TYPE} recursos.",
            )
        phase = self.repo.add_phase(
            version.id,
            data.phase_type,
            self.repo.next_phase_order(version.id, data.phase_type),
            placeholder_content(prompt),
        )
        self.repo.record_micro_version(phase.id, ova.id, phase.content)
        self.repo.commit("add_phase")
        return phase
