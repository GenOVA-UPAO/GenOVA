"""Adaptadores TOTP sobre pyotp, helpers de backup y SQLAlchemy."""

from __future__ import annotations

from uuid import UUID

import pyotp
from sqlalchemy.orm import Session

from auth.domain.user import TotpEnrollment
from auth.infrastructure.totp_tickets import _generate_backup_codes
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


class SqlAlchemyTotpUserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

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
