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
    TokenRevocation,
    TotpEnrollment,
    TotpLoginTicket,
    TotpLoginUser,
    UserAccess,
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
    "RevokedTokenRepository",
    "SessionTokenDecoder",
    "SessionUserRepository",
    "TokenGenerator",
    "TotpAuthenticator",
    "TotpAdminRepository",
    "TotpLoginUserRepository",
    "TotpTicketConsumer",
    "TotpTicketIssuer",
    "TotpUserRepository",
]


class AuthUserRepository(Protocol):
    def find_by_normalized_email(self, normalized_email: str) -> AuthUser | None:
        raise NotImplementedError

    def record_failed_attempt(
        self, user_id: str, attempts: int, locked_until: datetime | None
    ) -> None:
        """Persiste el nuevo estado de contadores (hace commit)."""

    def reset_counters(self, user_id: str) -> None:
        """Pone ``failed_login_attempts=0`` y ``locked_until=None`` (hace commit)."""


class PasswordVerifier(Protocol):
    def verify(self, raw: str, hashed: str) -> bool:
        raise NotImplementedError

    def verify_dummy(self) -> None:
        """Gasta un hash falso para nivelar el tiempo de respuesta."""


class LoginThrottle(Protocol):
    def is_throttled(self, normalized_email: str) -> bool:
        raise NotImplementedError


class TotpTicketIssuer(Protocol):
    def issue(self, user_id: str, *, remember_me: bool) -> str:
        raise NotImplementedError


class PasswordHasher(Protocol):
    def hash(self, raw: str) -> str:
        raise NotImplementedError


class PasswordPolicy(Protocol):
    def accepts(self, raw: str) -> bool:
        raise NotImplementedError


class TokenGenerator(Protocol):
    def generate(self) -> str:
        raise NotImplementedError


class EmailSender(Protocol):
    def send_verification(self, user: EmailRecipient, token: str) -> None:
        raise NotImplementedError

    def send_password_reset(self, user: PasswordResetUser, token: str) -> None:
        raise NotImplementedError


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
    ) -> RegisteredUser:
        raise NotImplementedError


class PasswordResetTokenRepository(Protocol):
    def find_active_user(self, normalized_email: str) -> PasswordResetUser | None:
        raise NotImplementedError

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        raise NotImplementedError

    def find_by_token(self, token: str) -> PasswordResetTokenRecord | None:
        raise NotImplementedError

    def delete(self, token: str) -> None:
        raise NotImplementedError

    def find_user(self, user_id: UUID) -> bool:
        raise NotImplementedError

    def apply_new_password(self, user_id: UUID, password_hash: str) -> None:
        raise NotImplementedError


class EmailVerificationTokenRepository(Protocol):
    def find_by_token(self, token: str) -> EmailVerificationTokenRecord | None:
        raise NotImplementedError

    def delete(self, token: str) -> None:
        raise NotImplementedError

    def find_user(self, user_id: UUID) -> EmailVerificationUser | None:
        raise NotImplementedError

    def mark_verified(self, user_id: UUID) -> None:
        raise NotImplementedError

    def find_user_by_normalized_email(
        self, normalized_email: str
    ) -> EmailVerificationUser | None:
        raise NotImplementedError

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        raise NotImplementedError


class SessionTokenDecoder(Protocol):
    def decode_for_revocation(self, token: str) -> TokenRevocation | None:
        raise NotImplementedError


class RevokedTokenRepository(Protocol):
    def exists(self, jti: str) -> bool:
        raise NotImplementedError

    def add(self, revocation: TokenRevocation) -> None:
        raise NotImplementedError


class SessionUserRepository(Protocol):
    def access_for(self, user_id: UUID) -> UserAccess:
        raise NotImplementedError


class TotpAuthenticator(Protocol):
    def create_enrollment(self, email: str) -> TotpEnrollment:
        raise NotImplementedError

    def verify(self, secret: str, code: str) -> bool:
        raise NotImplementedError

    def verify_backup(self, code: str, hashed: str) -> bool:
        raise NotImplementedError


class TotpUserRepository(Protocol):
    def save_setup(
        self,
        user_id: UUID,
        secret: str,
        hashed_backup_codes: list[dict[str, object]],
    ) -> None:
        raise NotImplementedError

    def enable(self, user_id: UUID) -> None:
        raise NotImplementedError

    def disable(self, user_id: UUID) -> None:
        raise NotImplementedError


class TotpTicketConsumer(Protocol):
    def consume(self, ticket: str) -> TotpLoginTicket | None:
        raise NotImplementedError


class TotpLoginUserRepository(Protocol):
    def find_by_id(self, user_id: str) -> TotpLoginUser | None:
        raise NotImplementedError

    def save_backup_codes(
        self, user_id: UUID, backup_codes: list[dict[str, object]]
    ) -> None:
        raise NotImplementedError


class TotpAdminRepository(Protocol):
    def disable_by_id(self, user_id: str) -> bool:
        raise NotImplementedError
