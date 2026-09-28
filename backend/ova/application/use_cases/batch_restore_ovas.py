"""Caso de uso: restaurar varias OVAs desde la papelera."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import BatchOvaInput, BatchOvaResult
from ova.application.ports import OvaLifecycleRepository


@dataclass(frozen=True, slots=True)
class BatchRestoreOvas:
    repo: OvaLifecycleRepository

    def execute(self, data: BatchOvaInput) -> BatchOvaResult:
        restored: list[str] = []
        skipped: list[str] = []
        for ova_id in data.ova_ids:
            ova = self.repo.get_trashed(ova_id)
            if ova is None or not ova.is_accessible_by(data.actor):
                skipped.append(ova_id)
                continue
            self.repo.restore(ova.id)
            restored.append(ova_id)

        self.repo.commit("batch_restore")
        return BatchOvaResult(completed=tuple(restored), skipped=tuple(skipped))
