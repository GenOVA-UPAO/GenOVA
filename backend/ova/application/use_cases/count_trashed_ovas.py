"""Caso de uso: contar las OVAs visibles en la papelera."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.ports import OvaLifecycleRepository
from ova.domain.model import OvaActor


@dataclass(frozen=True, slots=True)
class CountTrashedOvas:
    repo: OvaLifecycleRepository

    def execute(self, actor: OvaActor) -> int:
        return self.repo.count_trashed(None if actor.is_admin else actor.id)
