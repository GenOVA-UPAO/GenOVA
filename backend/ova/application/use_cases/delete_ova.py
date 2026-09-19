"""Caso de uso: enviar una OVA a la papelera."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from ova.application.dto import ManageOvaInput, OvaMutationResult
from ova.application.ports import OvaLifecycleRepository
from ova.domain.errors import OvaForbidden, OvaGenerating, OvaNotFound


@dataclass(frozen=True, slots=True)
class DeleteOva:
    repo: OvaLifecycleRepository

    def execute(self, data: ManageOvaInput) -> OvaMutationResult:
        ova = self.repo.get_active(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado o ya eliminado.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("No tienes permiso para eliminar este OVA.")
        if ova.status == "generando":
            raise OvaGenerating("No se puede eliminar el OVA mientras se está generando.")

        self.repo.move_to_trash(ova.id, datetime.now(UTC))
        self.repo.commit("delete_ova")
        return OvaMutationResult(id=ova.id)
