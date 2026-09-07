"""Caso de uso: restaurar una OVA desde la papelera."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import ManageOvaInput, OvaMutationResult
from ova.application.ports import OvaLifecycleRepository
from ova.domain.errors import OvaForbidden, OvaNotFound


@dataclass(frozen=True, slots=True)
class RestoreOva:
    repo: OvaLifecycleRepository

    def execute(self, data: ManageOvaInput) -> OvaMutationResult:
        ova = self.repo.get_trashed(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado en la papelera.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("No tienes permiso para restaurar este OVA.")

        self.repo.restore(ova.id)
        self.repo.commit("restore_ova")
        return OvaMutationResult(id=ova.id)
