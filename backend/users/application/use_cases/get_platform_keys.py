"""Caso de uso: estado enmascarado de las claves de plataforma."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import PlatformSettingsRepository


@dataclass(frozen=True, slots=True)
class GetPlatformKeys:
    repo: PlatformSettingsRepository

    def execute(self) -> dict:
        return self.repo.get_masked_keys()
