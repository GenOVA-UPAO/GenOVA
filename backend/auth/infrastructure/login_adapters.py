"""Adaptadores concretos del caso de uso de login.

- ``SqlAlchemyAuthUserRepository``: lee el usuario por su email canónico y
  persiste los contadores de bloqueo. Reutiliza la instancia del identity map
  (``db.get``) para no añadir un SELECT extra en la ruta de fallo (RN-001).
- ``BcryptPasswordVerifier`` / ``EmailLoginThrottle`` / ``TotpTicketAdapter``:
  finas envolturas sobre los helpers ya existentes.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.domain.user import AuthUser
from auth.infrastructure.email_throttle import email_throttled
from auth.infrastructure.totp_tickets import _issue_ticket
from core.security import verify_dummy, verify_password
from models import User


def _snapshot(row: User) -> AuthUser:
    return AuthUser(
        id=str(row.id),
        email=str(row.email),
        password_hash=str(row.password_hash),
        failed_login_attempts=int(row.failed_login_attempts or 0),
        locked_until=row.locked_until,
        email_verified=bool(row.email_verified),
        totp_enabled=bool(row.totp_enabled),
    )


class SqlAlchemyAuthUserRepository:
    """Mantiene la fila ORM leída en ``find_by_normalized_email`` y la muta en
    los métodos de escritura — igual que el router original (un único COMMIT,
    sin SELECT extra) y evitando recoercer el UUID a ``str`` para ``db.get``.
    """

    def __init__(self, db: Session) -> None:
        self._db = db
        self._row: User | None = None

    def find_by_normalized_email(self, normalized_email: str) -> AuthUser | None:
        row = self._db.execute(
            select(User).where(User.email_normalized == normalized_email)
        ).scalar_one_or_none()
        self._row = row
        return _snapshot(row) if row is not None else None

    def record_failed_attempt(
        self, user_id: str, attempts: int, locked_until: datetime | None
    ) -> None:
        assert self._row is not None and str(self._row.id) == user_id
        self._row.failed_login_attempts = attempts
        self._row.locked_until = locked_until
        self._db.commit()

    def reset_counters(self, user_id: str) -> None:
        assert self._row is not None and str(self._row.id) == user_id
        self._row.failed_login_attempts = 0
        self._row.locked_until = None
        self._db.commit()


class BcryptPasswordVerifier:
    def verify(self, raw: str, hashed: str) -> bool:
        return verify_password(raw, hashed)

    def verify_dummy(self) -> None:
        verify_dummy()


class EmailLoginThrottle:
    def is_throttled(self, normalized_email: str) -> bool:
        return email_throttled(normalized_email)


class TotpTicketAdapter:
    def issue(self, user_id: str, *, remember_me: bool) -> str:
        return _issue_ticket(user_id, remember_me=remember_me)
