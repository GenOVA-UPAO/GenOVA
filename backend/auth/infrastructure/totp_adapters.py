"""Adaptadores TOTP sobre pyotp, helpers de backup y SQLAlchemy."""

from __future__ import annotations

from uuid import UUID

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.domain.user import TotpEnrollment, TotpLoginTicket, TotpLoginUser
from auth.infrastructure.totp_tickets import (
    _consume_ticket,
    _generate_backup_codes,
    _verify_backup,
)
from core.database import commit_or_500
from models import User

_APP_NAME = "GenOVA"


class PyotpTotpAuthenticator:
    def create_enrollment(self, email: str) -> TotpEnrollment:
        secret = pyotp.random_base32()
        provisioning_uri = pyotp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name=_APP_NAME,
        )
        plaintext_codes, hashed_codes = _generate_backup_codes()
        return TotpEnrollment(
            provisioning_uri=provisioning_uri,
            secret=secret,
            backup_codes=tuple(plaintext_codes),
            hashed_backup_codes=hashed_codes,
        )

    def verify(self, secret: str, code: str) -> bool:
        return bool(pyotp.TOTP(secret).verify(code, valid_window=1))

    def verify_backup(self, code: str, hashed: str) -> bool:
        return _verify_backup(code, hashed)


class InMemoryTotpTicketConsumer:
    def consume(self, ticket: str) -> TotpLoginTicket | None:
        consumed = _consume_ticket(ticket)
        if consumed is None:
            return None
        user_id, remember_me = consumed
        return TotpLoginTicket(user_id=user_id, remember_me=remember_me)


class SqlAlchemyTotpUserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._login_row: User | None = None

    def _user(self, user_id: UUID) -> User:
        user = self._db.get(User, user_id)
        assert user is not None
        return user

    def save_setup(
        self,
        user_id: UUID,
        secret: str,
        hashed_backup_codes: list[dict[str, object]],
    ) -> None:
        user = self._user(user_id)
        user.totp_secret = secret
        user.totp_backup_codes = hashed_backup_codes
        commit_or_500(self._db, "totp_setup")

    def enable(self, user_id: UUID) -> None:
        self._user(user_id).totp_enabled = True
        commit_or_500(self._db, "totp_confirm")

    def disable(self, user_id: UUID) -> None:
        user = self._user(user_id)
        user.totp_secret = None
        user.totp_enabled = False
        user.totp_backup_codes = []
        commit_or_500(self._db, "totp_disable")

    def find_by_id(self, user_id: str) -> TotpLoginUser | None:
        self._login_row = self._db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        if self._login_row is None:
            return None
        return TotpLoginUser(
            id=self._login_row.id,
            email=str(self._login_row.email),
            totp_enabled=bool(self._login_row.totp_enabled),
            totp_secret=(
                str(self._login_row.totp_secret) if self._login_row.totp_secret else None
            ),
            backup_codes=[dict(entry) for entry in (self._login_row.totp_backup_codes or [])],
        )

    def save_backup_codes(
        self, user_id: UUID, backup_codes: list[dict[str, object]]
    ) -> None:
        assert self._login_row is not None and self._login_row.id == user_id
        self._login_row.totp_backup_codes = backup_codes
        commit_or_500(self._db, "totp_use_backup_code")

    def disable_by_id(self, user_id: str) -> bool:
        user = self._db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if user is None:
            return False
        user.totp_secret = None
        user.totp_enabled = False
        user.totp_backup_codes = []
        commit_or_500(self._db, "totp_admin_disable")
        return True
