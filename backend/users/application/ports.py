"""Puertos (driven) del dominio de usuarios."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from users.domain.profile import UserProfile


class UserProfileRepository(Protocol):
    """Persistencia del perfil propio. La implementación vive en `infrastructure/`."""

    def email_in_use(self, email: str, excluding_user_id: UUID) -> bool: ...

    def phone_number_in_use(self, phone_number: str, excluding_user_id: UUID) -> bool: ...

    def university_id_in_use(self, university_id: int, excluding_user_id: UUID) -> bool: ...

    def save_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> UserProfile: ...

    def save_theme(
        self, user_id: UUID, *, color_mode: str, design_mode: str, palette: dict | None
    ) -> dict: ...
