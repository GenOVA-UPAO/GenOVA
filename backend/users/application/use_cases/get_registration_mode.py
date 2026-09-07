"""Caso de uso: obtener el modo de registro por defecto (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import PlatformSettingsRepository


@dataclass(frozen=True, slots=True)
class GetRegistrationMode:
    repo: PlatformSettingsRepository

    def execute(self) -> str:
        return self.repo.get_registration_mode()
