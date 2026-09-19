"""Caso de uso: fijar el modo de registro por defecto (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.ports import PlatformSettingsRepository


@dataclass(frozen=True, slots=True)
class SaveRegistrationMode:
    repo: PlatformSettingsRepository

    def execute(self, role_name: str) -> str:
        clean = (role_name or "usuarios_prueba").strip()
        self.repo.save_registration_mode(clean)
        return clean
