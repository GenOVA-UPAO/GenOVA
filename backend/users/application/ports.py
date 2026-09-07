"""Puertos (driven) del dominio de usuarios."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from users.domain.account import UserAccount
from users.domain.admin import (
    AdminRoleSummary,
    AdminRoleUpdateResult,
    AdminTargetSummary,
    AdminUserSummary,
)
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


class AdminUserRepository(Protocol):
    """Persistencia del cluster de administración de usuarios."""

    def count_users(self) -> int: ...

    def list_page(self, offset: int, limit: int) -> list[AdminUserSummary]: ...

    def is_admin(self, user_id: UUID) -> bool: ...

    def assert_can_touch_target(self, caller_id: UUID, target_id: UUID) -> None: ...

    def get_target(self, user_id: UUID) -> AdminTargetSummary: ...

    def update_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> None: ...

    def get_role(self, role_id: UUID) -> AdminRoleSummary | None: ...

    def replace_role(self, user_id: UUID, role_id: UUID) -> AdminRoleUpdateResult: ...

    def set_status(self, user_id: UUID, is_active: bool) -> bool: ...

    def unlock(self, user_id: UUID) -> None: ...

    def issue_reset_token(self, user_id: UUID) -> str: ...
