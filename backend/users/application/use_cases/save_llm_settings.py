"""Caso de uso: guardar los ajustes LLM propios."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SaveLlmSettingsInput
from users.application.ports import UserSettingsRepository


@dataclass(frozen=True, slots=True)
class SaveLlmSettings:
    repo: UserSettingsRepository

    def execute(self, data: SaveLlmSettingsInput) -> dict:
        return self.repo.save_llm_settings(data.user_id, data.settings)
