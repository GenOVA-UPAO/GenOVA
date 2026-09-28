"""Caso de uso: guardar la lista de modelos habilitados propia."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SaveEnabledModelsInput
from users.application.ports import UserSettingsRepository


@dataclass(frozen=True, slots=True)
class SaveEnabledModels:
    repo: UserSettingsRepository

    def execute(self, data: SaveEnabledModelsInput) -> list:
        return self.repo.save_enabled_models(data.user_id, data.models)
