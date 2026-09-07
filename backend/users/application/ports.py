"""Puertos (driven) del dominio de usuarios."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from users.domain.account import UserAccount
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


class UserAccountRepository(Protocol):
    """Persistencia de la seguridad de la cuenta propia."""

    def get(self, user_id: UUID) -> UserAccount | None: ...

    def update_password(self, user_id: UUID, password_hash: str) -> None: ...

    def assert_not_sole_admin(self, user_id: UUID) -> None:
        """Lanza `SoleAdminRemoval` si el usuario es el único admin activo."""
        ...

    def deactivate_and_anonymize(self, user_id: UUID) -> None:
        """Soft-delete: anonimiza el PII en sitio y persiste (commit)."""
        ...


class PasswordHasher(Protocol):
    """Hashing/verificación de contraseñas (adaptador sobre bcrypt)."""

    def verify(self, raw: str, hashed: str) -> bool: ...

    def hash(self, raw: str) -> str: ...


class ResourceConfigRepository(Protocol):
    """Persistencia de la configuración de recursos por usuario."""

    def get(self, user_id: UUID) -> dict: ...

    def save(self, user_id: UUID, configs: dict) -> dict: ...
