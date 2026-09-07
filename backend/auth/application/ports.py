"""Puertos (Protocol) del flujo de autenticación.

Los adaptadores concretos viven en ``auth.infrastructure`` y se cablean en
``auth.container``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol
from uuid import UUID

from auth.domain.user import (
    AuthUser,
    EmailRecipient,
    EmailVerificationTokenRecord,
    EmailVerificationUser,
    PasswordResetTokenRecord,
    PasswordResetUser,
    RegisteredUser,
)

__all__ = [
    "AuthUser",
    "AuthUserRepository",
    "EmailRecipient",
    "EmailSender",
    "EmailVerificationTokenRepository",
    "LoginThrottle",
    "PasswordHasher",
    "PasswordPolicy",
    "PasswordResetTokenRepository",
    "PasswordVerifier",
    "RegistrationRepository",
    "TokenGenerator",
    "TotpTicketIssuer",
]


class AuthUserRepository(Protocol):
    def find_by_normalized_email(self, normalized_email: str) -> AuthUser | None: ...

    def record_failed_attempt(
        self, user_id: str, attempts: int, locked_until: datetime | None
    ) -> None:
        """Persiste el nuevo estado de contadores (hace commit)."""

    def reset_counters(self, user_id: str) -> None:
        """Pone ``failed_login_attempts=0`` y ``locked_until=None`` (hace commit)."""


class PasswordVerifier(Protocol):
    def verify(self, raw: str, hashed: str) -> bool: ...

    def verify_dummy(self) -> None:
        """Gasta un hash falso para nivelar el tiempo de respuesta."""


class LoginThrottle(Protocol):
    def is_throttled(self, normalized_email: str) -> bool: ...


class TotpTicketIssuer(Protocol):
    def issue(self, user_id: str, *, remember_me: bool) -> str: ...


class PasswordHasher(Protocol):
    def hash(self, raw: str) -> str: ...


class PasswordPolicy(Protocol):
    def accepts(self, raw: str) -> bool: ...


class TokenGenerator(Protocol):
    def generate(self) -> str: ...


class EmailSender(Protocol):
    def send_verification(self, user: EmailRecipient, token: str) -> None: ...

    def send_password_reset(self, user: PasswordResetUser, token: str) -> None: ...


class RegistrationRepository(Protocol):
    def create(
        self,
        *,
        email: str,
        normalized_email: str,
        password_hash: str,
        full_name: str | None,
        email_verified: bool,
        verification_token: str | None,
        verification_expires_at: datetime | None,
    ) -> RegisteredUser: ...


class PasswordResetTokenRepository(Protocol):
    def find_active_user(self, normalized_email: str) -> PasswordResetUser | None: ...

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None: ...

    def find_by_token(self, token: str) -> PasswordResetTokenRecord | None: ...

    def delete(self, token: str) -> None: ...

    def find_user(self, user_id: UUID) -> bool: ...

    def apply_new_password(self, user_id: UUID, password_hash: str) -> None: ...


class EmailVerificationTokenRepository(Protocol):
    def find_by_token(self, token: str) -> EmailVerificationTokenRecord | None: ...

    def delete(self, token: str) -> None: ...

    def find_user(self, user_id: UUID) -> EmailVerificationUser | None: ...

    def mark_verified(self, user_id: UUID) -> None: ...

    def find_user_by_normalized_email(
        self, normalized_email: str
    ) -> EmailVerificationUser | None: ...

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None: ...
