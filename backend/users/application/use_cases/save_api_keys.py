"""Caso de uso: guardar (upsert/borrar) las claves de API propias."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SaveApiKeysInput
from users.application.ports import ApiKeyRepository
from users.domain.api_keys import assert_min_key_length, filter_key_updates


@dataclass(frozen=True, slots=True)
class SaveApiKeys:
    repo: ApiKeyRepository

    def execute(self, data: SaveApiKeysInput) -> dict:
        # Mismo orden de validaciones que el router original: filtro de
        # providers (400 si no queda ninguno) y luego longitud mínima.
        updates = filter_key_updates(data.payload, data.providers)
        assert_min_key_length(updates)
        return self.repo.save(data.user_id, updates)
