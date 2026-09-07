"""Caso de uso: actualizar el tema de la interfaz del propio usuario."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import UpdateThemeInput
from users.application.ports import UserProfileRepository


@dataclass(frozen=True, slots=True)
class UpdateUserTheme:
    repo: UserProfileRepository

    def execute(self, data: UpdateThemeInput) -> dict:
        return self.repo.save_theme(
            data.user_id,
            color_mode=data.color_mode,
            design_mode=data.design_mode,
            palette=data.palette,
        )
