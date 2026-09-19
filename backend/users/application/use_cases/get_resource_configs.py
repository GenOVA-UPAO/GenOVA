"""Caso de uso: obtener la configuración de recursos propia."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from users.application.ports import ResourceConfigRepository


@dataclass(frozen=True, slots=True)
class GetResourceConfigs:
    repo: ResourceConfigRepository

    def execute(self, user_id: UUID) -> dict:
        return self.repo.get(user_id)
