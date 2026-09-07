"""Caso de uso: guardar los ajustes de OVA propios."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SaveOvaSettingsInput
from users.application.ports import UserSettingsRepository


@dataclass(frozen=True, slots=True)
class SaveOvaSettings:
    repo: UserSettingsRepository

    def execute(self, data: SaveOvaSettingsInput) -> dict:
        return self.repo.save_ova_settings(data.user_id, data.settings)
