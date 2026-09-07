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
from users.domain.links import LinkParticipant, LinkRecord, LinkSnapshot
from users.domain.profile import UserProfile


class ApiKeyRepository(Protocol):
    """Almacenamiento de claves de API por usuario.

    Las claves en claro NUNCA salen de infrastructure: los métodos devuelven
    el mapa ya enmascarado.
    """

    def get_masked(self, user_id) -> dict: ...

    def save(self, user_id, updates: dict) -> dict: ...


class UserLinkRepository(Protocol):
    """Persistencia de los vínculos entre usuarios (invitación por código)."""

    def list_for_owner(self, owner_id) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]: ...

    def list_all(self) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]: ...

    def list_redeemable(self, now, invite_email: str) -> list[LinkRecord]: ...

    def get_participant(self, user_id: str) -> LinkParticipant | None: ...

    def create(
        self,
        owner_id,
        *,
        invite_email: str | None,
        code_hash: str,
        expires_at,
        op: str,
    ) -> LinkSnapshot: ...

    def redeem(self, link_id: str, *, linked_user_id, consumed_at, op: str) -> LinkSnapshot: ...

    def get_owned(self, link_id: UUID, owner_id) -> LinkRecord: ...

    def rotate_code(self, link_id: UUID, *, code_hash: str, expires_at, op: str) -> LinkSnapshot: ...

    def delete_owned(self, link_id: UUID, owner_id) -> None: ...

    def delete_any(self, link_id: UUID) -> None: ...


class UserSettingsRepository(Protocol):
    """Ajustes de generación por usuario (columnas JSONB de la fila User)."""

    def get_enabled_models(self, user_id) -> list: ...

    def save_enabled_models(self, user_id, clean: list) -> list: ...


class AnalyticsRepository(Protocol):
    """Consultas agregadas de la analítica de aprendizaje (solo lectura)."""

    def is_admin(self, user_id) -> bool: ...

    def linked_student_ids(self, professor_id) -> list: ...

    def count_ovas(self, owner_ids: list | None) -> int: ...

    def count_users(self) -> int: ...

    def ova_status_breakdown(self, owner_ids: list | None) -> list: ...

    def ovas_per_day(self, owner_ids: list | None) -> list: ...

    def top_creators(self, owner_ids: list | None) -> list: ...

    def recent_ovas(self, owner_ids: list | None) -> list: ...


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
