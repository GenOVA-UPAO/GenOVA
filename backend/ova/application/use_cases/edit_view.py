"""Casos de uso de la vista, historial y comparación del editor."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import VersionInput
from ova.application.ports import OvaEditorRepository
from ova.domain.editor import EditorOva, EditorVersion, phase_to_dict, version_to_dict
from ova.domain.errors import OvaEditError, OvaForbidden, OvaGenerating, OvaNotFound


@dataclass(frozen=True, slots=True)
class EditView:
    repo: OvaEditorRepository

    def editor(self, data: VersionInput) -> dict:
        ova = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        if ova.status == "generando":
            raise OvaGenerating("No disponible mientras se genera el OVA.")
        active = self.repo.get_or_create_active_version(ova)
        return {
            "ova_id": ova.id,
            "title": ova.title,
            "status": ova.status,
            "current_version": version_to_dict(active, include_phases=True),
            "version_history": [
                version_to_dict(version) for version in self.repo.list_versions(ova.id)
            ],
        }

    def versions(self, data: VersionInput) -> dict:
        self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        return {
            "ova_id": data.ova_id,
            "versions": [
                version_to_dict(version) for version in self.repo.list_versions(data.ova_id)
            ],
        }

    def revert(self, data: VersionInput) -> EditorVersion:
        ova = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        if ova.status == "generando":
            raise OvaGenerating("No se puede revertir mientras genera.")
        target = self.repo.get_version(data.version_id, ova.id, with_phases=True)
        if target is None:
            raise OvaEditError(404, "version_not_found", "Versión no encontrada.")
        self.repo.activate_version(ova.id, target.id)
        self.repo.set_current_version(ova.id, target.id)
        self.repo.rebuild_scorm(ova.id, target.id, data.actor.id)
        self.repo.commit("revert_version")
        return target

    def diff(self, data: VersionInput, other_version_id: str) -> dict:
        ova = self._resolve(data.ova_id, data.actor.id, data.actor.is_admin)
        left = self.repo.get_version(data.version_id, ova.id, with_phases=True)
        right = self.repo.get_version(other_version_id, ova.id, with_phases=True)
        if left is None or right is None:
            raise OvaEditError(
                404,
                "version_not_found",
                "Una o ambas versiones no encontradas.",
            )
        return {
            "v1": {"version": version_to_dict(left), "phases": [phase_to_dict(p) for p in left.phases]},
            "v2": {"version": version_to_dict(right), "phases": [phase_to_dict(p) for p in right.phases]},
        }

    def _resolve(self, ova_id: str, actor_id: str, is_admin: bool) -> EditorOva:
        ova = self.repo.get_ova(ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != actor_id and not is_admin:
            raise OvaForbidden("Sin permisos.")
        return ova
