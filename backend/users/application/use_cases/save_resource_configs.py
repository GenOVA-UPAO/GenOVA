"""Caso de uso: actualizar la configuración de recursos propia."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SaveResourceConfigsInput
from users.application.ports import ResourceConfigRepository
from users.domain.resource_configs import validate_resource_configs


@dataclass(frozen=True, slots=True)
class SaveResourceConfigs:
    repo: ResourceConfigRepository

    def execute(self, data: SaveResourceConfigsInput) -> dict:
        clean = validate_resource_configs(data.configs)
        return self.repo.save(data.user_id, clean)
