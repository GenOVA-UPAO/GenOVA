"""Caso de uso: listar la papelera paginada."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import TrashPageInput, TrashPageResult
from ova.application.ports import OvaLifecycleRepository


@dataclass(frozen=True, slots=True)
class ListTrashedOvas:
    repo: OvaLifecycleRepository

    def execute(self, data: TrashPageInput) -> TrashPageResult:
        owner_id = None if data.actor.is_admin else data.actor.id
        total = self.repo.count_trashed(owner_id)
        ovas = self.repo.list_trashed(
            owner_id,
            offset=(data.page - 1) * data.limit,
            limit=data.limit,
        )
        return TrashPageResult(
            ovas=tuple(ovas),
            total_items=total,
            page=data.page,
            limit=data.limit,
        )
