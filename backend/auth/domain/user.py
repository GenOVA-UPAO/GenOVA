"""Entidad de dominio: instantánea del usuario para el flujo de login.

Se captura de una vez (no atributos perezosos tras el commit con
``expire_on_commit=True``). No es el ORM ``User`` — solo los campos que las
políticas de autenticación necesitan.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID


class EmailRecipient(Protocol):
    email: str
    full_name: str | None


@dataclass(frozen=True, slots=True)
class AuthUser:
    id: str
    email: str
    password_hash: str
    failed_login_attempts: int
    locked_until: datetime | None
    email_verified: bool
    totp_enabled: bool


@dataclass(frozen=True, slots=True)
class RegisteredUser:
    id: str
    email: str
    full_name: str | None


@dataclass(frozen=True, slots=True)
class PasswordResetUser:
    id: UUID
    email: str
    full_name: str | None


@dataclass(frozen=True, slots=True)
class PasswordResetTokenRecord:
    user_id: UUID
    token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class EmailVerificationUser:
    id: UUID
    email: str
    full_name: str | None
    email_verified: bool


@dataclass(frozen=True, slots=True)
class EmailVerificationTokenRecord:
    user_id: UUID
    token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    id: UUID
    email: str
    full_name: str | None
    university_id: int | None
    gender: str | None
    phone_number: str | None
    theme_settings: dict[str, object]
    created_at: datetime | None
    totp_enabled: bool
    totp_secret: str | None
    totp_backup_codes: list[dict[str, object]]


@dataclass(frozen=True, slots=True)
class UserAccess:
    role: str | None
    permissions: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class TokenRevocation:
    jti: str
    user_id: str | None
    expires_at: datetime
