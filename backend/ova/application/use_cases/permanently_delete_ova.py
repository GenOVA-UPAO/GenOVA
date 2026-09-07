"""Caso de uso: purgar una OVA y su paquete SCORM."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import ManageOvaInput, OvaMutationResult
from ova.application.ports import OvaLifecycleRepository, ScormPackageCleaner
from ova.domain.errors import OvaForbidden, OvaNotFound


@dataclass(frozen=True, slots=True)
class PermanentlyDeleteOva:
    repo: OvaLifecycleRepository
    packages: ScormPackageCleaner

    def execute(self, data: ManageOvaInput) -> OvaMutationResult:
        ova = self.repo.get_trashed(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado en la papelera.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("No tienes permiso para eliminar este OVA.")

        self.repo.stage_permanent_delete(ova.id)
        self.repo.commit("permanent_delete_ova")
        self.packages.delete(ova.file_path, ova.storage_key)
        return OvaMutationResult(id=data.ova_id)
