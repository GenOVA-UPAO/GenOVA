"""Caso de uso: purgar varias OVAs y sus paquetes SCORM."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import BatchOvaInput, BatchOvaResult
from ova.application.ports import OvaLifecycleRepository, ScormPackageCleaner


@dataclass(frozen=True, slots=True)
class BatchDeleteOvas:
    repo: OvaLifecycleRepository
    packages: ScormPackageCleaner

    def execute(self, data: BatchOvaInput) -> BatchOvaResult:
        deleted: list[str] = []
        skipped: list[str] = []
        packages: list[tuple[str | None, str | None]] = []
        for ova_id in data.ova_ids:
            ova = self.repo.get_trashed(ova_id)
            if ova is None or not ova.is_accessible_by(data.actor):
                skipped.append(ova_id)
                continue
            packages.append((ova.file_path, ova.storage_key))
            self.repo.stage_permanent_delete(ova.id)
            deleted.append(ova_id)

        self.repo.commit("batch_permanent_delete")
        for file_path, storage_key in packages:
            self.packages.delete(file_path, storage_key)
        return BatchOvaResult(completed=tuple(deleted), skipped=tuple(skipped))
