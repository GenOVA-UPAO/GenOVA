"""Caso de uso: upsert/borrado de claves de plataforma (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import SavePlatformKeysInput
from users.application.ports import PlatformSettingsRepository
from users.domain.api_keys import assert_min_key_length, filter_key_updates


@dataclass(frozen=True, slots=True)
class SavePlatformKeys:
    repo: PlatformSettingsRepository

    def execute(self, data: SavePlatformKeysInput) -> dict:
        # Mismas validaciones y mensajes que las claves de API propias.
        updates = filter_key_updates(data.payload, data.providers)
        assert_min_key_length(updates)
        self.repo.save_keys(updates)
        return updates
