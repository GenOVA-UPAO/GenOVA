"""Casos de uso para editar, reordenar y eliminar fases."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import PhaseContentInput, ReorderPhasesInput
from ova.application.ports import OvaEditorRepository
from ova.domain.editor import EditorOva, EditorVersion
from ova.domain.errors import OvaEditError, OvaForbidden, OvaGenerating, OvaNotFound


@dataclass(frozen=True, slots=True)
class EditPhases:
    repo: OvaEditorRepository

    def reorder(self, data: ReorderPhasesInput) -> int:
        if not data.reorders:
            raise OvaEditError(400, "empty", "Lista de reordenamiento vacía.")
        _, active = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        phase_ids = tuple(item.phase_id for item in data.reorders)
        phases = self.repo.get_phases(phase_ids, active.id)
        if len(phases) != len(data.reorders):
            raise OvaEditError(404, "phases_not_found", "Una o más fases no existen.")
        if len({phase.phase_type for phase in phases}) > 1:
            raise OvaEditError(
                422,
                "cross_phase_move",
                "No se puede mover un recurso entre fases distintas.",
            )
        self.repo.reorder(tuple((item.phase_id, item.new_order) for item in data.reorders))
        self.repo.commit("reorder_phases")
        return len(data.reorders)

    def delete(self, data: PhaseContentInput) -> EditorVersion:
        ova, active = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        if self.repo.get_phase(data.phase_id, active.id) is None:
            raise OvaEditError(404, "phase_not_found", "Fase no encontrada.")
        remaining = tuple(
            phase for phase in self.repo.list_phases(active.id) if phase.id != data.phase_id
        )
        if not remaining:
            raise OvaEditError(422, "last_phase", "No se puede eliminar la única fase restante.")
        version = self.repo.create_next_version(ova, active, remaining)
        self.repo.rebuild_scorm(ova.id, version.id, data.actor.id)
        self.repo.set_current_version(ova.id, version.id)
        self.repo.commit("delete_phase")
        return version

    def save(self, data: PhaseContentInput) -> EditorVersion:
        if not data.content.strip():
            raise OvaEditError(400, "content_required", "El contenido no puede estar vacío.")
        ova, active = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        phase = self.repo.get_phase(data.phase_id, active.id)
        if phase is None:
            raise OvaEditError(404, "phase_not_found", "Fase no encontrada.")
        phases = tuple(
            type(current)(
                id=current.id,
                phase_type=current.phase_type,
                phase_order=current.phase_order,
                content=data.content if current.id == data.phase_id else current.content,
                regenerated=current.regenerated,
                resource_type_id=current.resource_type_id,
                title=current.title,
            )
            for current in self.repo.list_phases(active.id)
        )
        version = self.repo.create_next_version(ova, active, phases)
        edited_phase = next(
            (item for item in version.phases if item.phase_order == phase.phase_order), None
        )
        if edited_phase is not None:
            self.repo.record_micro_version(edited_phase.id, ova.id, data.content)
        self.repo.rebuild_scorm(ova.id, version.id, data.actor.id)
        self.repo.set_current_version(ova.id, version.id)
        self.repo.commit("save_phase")
        return version

    def _resolve(self, ova_id: str, actor_id: str, is_admin: bool) -> tuple[EditorOva, EditorVersion]:
        ova = self.repo.get_ova(ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != actor_id and not is_admin:
            raise OvaForbidden("Sin permisos.")
        if ova.status == "generando":
            raise OvaGenerating("No se puede editar mientras genera.")
        return ova, self.repo.get_or_create_active_version(ova)
