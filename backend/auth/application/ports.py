"""Puertos (Protocol) del flujo de autenticación.

Los adaptadores concretos viven en ``auth.infrastructure`` y se cablean en
``auth.container``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from auth.domain.user import AuthUser

__all__ = [
    "AuthUser",
    "AuthUserRepository",
    "LoginThrottle",
    "PasswordVerifier",
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
