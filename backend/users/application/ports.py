"""Puertos (driven) del dominio de usuarios."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from users.domain.account import UserAccount
from users.domain.admin import (
    AdminRoleSummary,
    AdminRoleUpdateResult,
    AdminTargetSummary,
    AdminUserListFilter,
    AdminUserSummary,
)
from users.domain.links import LinkParticipant, LinkRecord, LinkSnapshot
from users.domain.profile import UserProfile


class ApiKeyRepository(Protocol):
    """Almacenamiento de claves de API por usuario.

    Las claves en claro NUNCA salen de infrastructure: los métodos devuelven
    el mapa ya enmascarado.
    """

    def get_masked(self, user_id) -> dict:
        raise NotImplementedError

    def save(self, user_id, updates: dict) -> dict:
        raise NotImplementedError


class UserLinkRepository(Protocol):
    """Persistencia de los vínculos entre usuarios (invitación por código)."""

    def list_for_owner(self, owner_id) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]:
        raise NotImplementedError

    def list_all(self) -> tuple[list[LinkSnapshot], dict[str, LinkParticipant]]:
        raise NotImplementedError

    def list_redeemable(self, now, invite_email: str) -> list[LinkRecord]:
        raise NotImplementedError
    def reserve_attempt(self, selector: str, now, invite_email: str) -> LinkRecord | None:
        raise NotImplementedError

    def get_participant(self, user_id: str) -> LinkParticipant | None:
        raise NotImplementedError

    def create(
        self,
        owner_id,
        *,
        invite_email: str | None,
        code_hash: str,
        code_selector: str,
        expires_at,
        op: str,
    ) -> LinkSnapshot:
        raise NotImplementedError

    def redeem(self, link_id: str, *, linked_user_id, consumed_at, op: str) -> LinkSnapshot:
        raise NotImplementedError

    def get_owned(self, link_id: UUID, owner_id) -> LinkRecord:
        raise NotImplementedError

    def rotate_code(self, link_id: UUID, *, code_hash: str, code_selector: str, expires_at, op: str) -> LinkSnapshot:
        raise NotImplementedError

    def delete_owned(self, link_id: UUID, owner_id) -> None:
        raise NotImplementedError

    def delete_any(self, link_id: UUID) -> None:
        raise NotImplementedError


class PlatformSettingsRepository(Protocol):
    """Configuración de plataforma (PlatformConfig); claves solo enmascaradas."""

    def get_masked_keys(self) -> dict:
        raise NotImplementedError

    def save_keys(self, updates: dict) -> None:
        raise NotImplementedError

    def get_registration_mode(self) -> str:
        raise NotImplementedError

    def save_registration_mode(self, role_name: str) -> None:
        raise NotImplementedError


class UserSettingsRepository(Protocol):
    """Ajustes de generación por usuario (columnas JSONB de la fila User)."""

    def get_enabled_models(self, user_id) -> list:
        raise NotImplementedError

    def save_enabled_models(self, user_id, clean: list) -> list:
        raise NotImplementedError

    def get_ova_settings(self, user_id) -> dict | None:
        raise NotImplementedError

    def save_ova_settings(self, user_id, settings: dict) -> dict:
        raise NotImplementedError

    def save_llm_settings(self, user_id, clean: dict) -> dict:
        raise NotImplementedError

    def has_own_llm_key(self, user_id, providers) -> bool:
        raise NotImplementedError


class AnalyticsRepository(Protocol):
    """Consultas agregadas de la analítica de aprendizaje (solo lectura)."""

    def is_admin(self, user_id) -> bool:
        raise NotImplementedError

    def linked_student_ids(self, professor_id) -> list:
        raise NotImplementedError

    def count_ovas(self, owner_ids: list | None) -> int:
        raise NotImplementedError

    def count_users(self) -> int:
        raise NotImplementedError

    def ova_status_breakdown(self, owner_ids: list | None) -> list:
        raise NotImplementedError

    def ovas_per_day(self, owner_ids: list | None) -> list:
        raise NotImplementedError

    def top_creators(self, owner_ids: list | None) -> list:
        raise NotImplementedError

    def recent_ovas(self, owner_ids: list | None) -> list:
        raise NotImplementedError


class UserProfileRepository(Protocol):
    def request_email_change(self, user_id: UUID, email: str, totp_code: str | None) -> None:
        raise NotImplementedError

    """Persistencia del perfil propio. La implementación vive en `infrastructure/`."""

    def email_in_use(self, email: str, excluding_user_id: UUID) -> bool:
        raise NotImplementedError

    def phone_number_in_use(self, phone_number: str, excluding_user_id: UUID) -> bool:
        raise NotImplementedError

    def university_id_in_use(self, university_id: int, excluding_user_id: UUID) -> bool:
        raise NotImplementedError

    def save_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> UserProfile:
        raise NotImplementedError

    def save_theme(
        self, user_id: UUID, *, color_mode: str, design_mode: str, palette: dict | None
    ) -> dict:
        raise NotImplementedError


class UserAccountRepository(Protocol):
    """Persistencia de la seguridad de la cuenta propia."""

    def get(self, user_id: UUID) -> UserAccount | None:
        raise NotImplementedError

    def update_password(self, user_id: UUID, password_hash: str) -> None:
        raise NotImplementedError

    def assert_not_sole_admin(self, user_id: UUID) -> None:
        """Lanza `SoleAdminRemoval` si el usuario es el único admin activo."""
        raise NotImplementedError

    def deactivate_and_anonymize(self, user_id: UUID) -> None:
        """Soft-delete: anonimiza el PII en sitio y persiste (commit)."""
        raise NotImplementedError


class PasswordHasher(Protocol):
    """Hashing/verificación de contraseñas (adaptador sobre bcrypt)."""

    def verify(self, raw: str, hashed: str) -> bool:
        raise NotImplementedError

    def hash(self, raw: str) -> str:
        raise NotImplementedError


class ResourceConfigRepository(Protocol):
    """Persistencia de la configuración de recursos por usuario."""

    def get(self, user_id: UUID) -> dict:
        raise NotImplementedError

    def save(self, user_id: UUID, configs: dict) -> dict:
        raise NotImplementedError


class AdminUserRepository(Protocol):
    """Persistencia del cluster de administración de usuarios."""

    def count_users(self, filters: AdminUserListFilter) -> int:
        raise NotImplementedError

    def list_page(
        self, filters: AdminUserListFilter, offset: int, limit: int
    ) -> list[AdminUserSummary]:
        raise NotImplementedError

    def is_admin(self, user_id: UUID) -> bool:
        raise NotImplementedError

    def assert_can_touch_target(self, caller_id: UUID, target_id: UUID) -> None:
        raise NotImplementedError

    def get_target(self, user_id: UUID) -> AdminTargetSummary:
        raise NotImplementedError

    def update_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> None:
        raise NotImplementedError

    def get_role(self, role_id: UUID) -> AdminRoleSummary | None:
        raise NotImplementedError

    def replace_role(self, user_id: UUID, role_id: UUID) -> AdminRoleUpdateResult:
        raise NotImplementedError

    def set_status(self, user_id: UUID, is_active: bool) -> bool:
        raise NotImplementedError

    def unlock(self, user_id: UUID) -> None:
        raise NotImplementedError

    def issue_reset_token(self, user_id: UUID) -> str:
        raise NotImplementedError
