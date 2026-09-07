"""Caso de uso: enviar varias OVAs a la papelera."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from ova.application.dto import BatchOvaInput, BatchOvaResult
from ova.application.ports import OvaLifecycleRepository


@dataclass(frozen=True, slots=True)
class BatchMoveOvasToTrash:
    repo: OvaLifecycleRepository

    def execute(self, data: BatchOvaInput) -> BatchOvaResult:
        moved: list[str] = []
        skipped: list[str] = []
        for ova_id in data.ova_ids:
            ova = self.repo.get_active(ova_id)
            if ova is None or not ova.is_accessible_by(data.actor) or ova.status == "generando":
                skipped.append(ova_id)
                continue
            self.repo.move_to_trash(ova.id, datetime.now(UTC))
            moved.append(ova_id)

        self.repo.commit("batch_move_to_trash")
        return BatchOvaResult(completed=tuple(moved), skipped=tuple(skipped))
