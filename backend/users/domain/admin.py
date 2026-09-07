"""Entidades y reglas puras del cluster de administración de usuarios."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from users.domain.errors import (
    AdminTargetProtected,
    InvalidGender,
    InvalidPhoneNumber,
    InvalidRoleId,
    InvalidUserId,
    SelfRoleChangeForbidden,
)
from users.domain.profile import VALID_GENDERS


@dataclass(frozen=True, slots=True)
class AdminRoleSummary:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class AdminUserSummary:
    """Instantánea de un usuario para el listado administrativo."""

    id: str
    email: str
    full_name: str | None
    university_id: int | None
    gender: str | None
    phone_number: str | None
    is_active: bool
    failed_login_attempts: int
    locked_until: str | None
    role: AdminRoleSummary | None
    created_at: str | None


@dataclass(frozen=True, slots=True)
class AdminRoleUpdateResult:
    """Salida de cambiar el rol de un usuario gestionado."""

    id: str
    email: str
    full_name: str | None
    role: AdminRoleSummary
    updated_at: str | None


def parse_user_id(raw: str) -> UUID:
    try:
        return UUID(raw)
    except (ValueError, TypeError) as exc:
        raise InvalidUserId() from exc


def parse_role_id(raw: str) -> UUID:
    try:
        return UUID(raw)
    except (ValueError, TypeError) as exc:
        raise InvalidRoleId() from exc


def assert_can_touch_target(*, caller_is_admin: bool, target_is_admin: bool) -> None:
    """Block hierarchy violations: non-admin callers cannot mutate admin users."""
    if target_is_admin and not caller_is_admin:
        raise AdminTargetProtected()


def assert_not_self(*, caller_id: UUID, target_id: UUID) -> None:
    if caller_id == target_id:
        raise SelfRoleChangeForbidden()


def normalize_gender(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip().lower()
    if value not in VALID_GENDERS:
        raise InvalidGender("El sexo debe ser 'masculino', 'femenino' u 'otro'.")
    return value


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    cleaned = value.replace("+", "").replace(" ", "").replace("-", "")
    if not cleaned.isdigit():
        raise InvalidPhoneNumber("El número de teléfono solo debe contener dígitos y '+'.")
    return value
