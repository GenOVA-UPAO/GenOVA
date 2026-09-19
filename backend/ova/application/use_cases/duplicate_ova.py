"""Caso de uso: duplicar una OVA con su versión activa y sus fases."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import DuplicateOvaInput, DuplicateOvaResult
from ova.application.ports import OvaDuplicationRepository
from ova.domain.errors import OvaForbidden, OvaGenerating, OvaNotFound


@dataclass(frozen=True, slots=True)
class DuplicateOva:
    repo: OvaDuplicationRepository

    def execute(self, data: DuplicateOvaInput) -> DuplicateOvaResult:
        source = self.repo.get_duplicate_source(data.ova_id)
        if source is None:
            raise OvaNotFound("OVA no encontrado.")
        if source.owner_id != data.actor.id and not data.actor.is_admin:
            raise OvaForbidden("Sin permisos.")
        if source.status == "generando":
            raise OvaGenerating("No se puede duplicar mientras se está generando.")

        title = self.repo.next_copy_title(source.title, data.actor.id)
        ova_id = self.repo.create_ova(data.actor.id, title, source.description, "borrador")
        version_id = self.repo.create_version(ova_id, 1, source.prompt)
        self.repo.add_phases(version_id, source.phases)
        self.repo.set_current_version(ova_id, version_id)
        self.repo.commit("duplicate_ova")
        return DuplicateOvaResult(id=ova_id, title=title)
