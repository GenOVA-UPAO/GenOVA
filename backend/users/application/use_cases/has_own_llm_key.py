"""Caso de uso: saber si el usuario tiene clave LLM propia (o es admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import UserSettingsRepository


@dataclass(frozen=True, slots=True)
class HasOwnLlmKey:
    repo: UserSettingsRepository

    def execute(self, user_id, providers) -> bool:
        return self.repo.has_own_llm_key(user_id, providers)
