"""Caso de uso: obtener el estado enmascarado de las claves de API propias."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import ApiKeyRepository


@dataclass(frozen=True, slots=True)
class GetApiKeys:
    repo: ApiKeyRepository

    def execute(self, user_id) -> dict:
        return self.repo.get_masked(user_id)
