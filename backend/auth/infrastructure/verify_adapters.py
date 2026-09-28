"""Persistencia SQLAlchemy para verificación de correo."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.domain.user import EmailVerificationTokenRecord, EmailVerificationUser
from core.database import commit_or_500
from models import EmailVerificationToken, User


def _user_snapshot(row: User) -> EmailVerificationUser:
    return EmailVerificationUser(
        id=row.id,
        email=str(row.email),
        full_name=row.full_name,
        email_verified=bool(row.email_verified),
    )


class SqlAlchemyEmailVerificationTokenRepository:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._user_row: User | None = None

    def find_by_token(self, token: str) -> EmailVerificationTokenRecord | None:
        row = self._db.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token == token)
        ).scalar_one_or_none()
        if row is None:
            return None
        return EmailVerificationTokenRecord(
            user_id=row.user_id,
            token=str(row.token),
            expires_at=row.expires_at,
        )

    def delete(self, token: str) -> None:
        self._db.execute(
            EmailVerificationToken.__table__.delete().where(
                EmailVerificationToken.token == token
            )
        )
        commit_or_500(self._db, "delete_email_verification_token")

    def find_user(self, user_id: UUID) -> EmailVerificationUser | None:
        self._user_row = self._db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        return _user_snapshot(self._user_row) if self._user_row is not None else None

    def mark_verified(self, user_id: UUID) -> None:
        assert self._user_row is not None and self._user_row.id == user_id
        self._user_row.email_verified = True
        self._db.execute(
            EmailVerificationToken.__table__.delete().where(
                EmailVerificationToken.user_id == user_id
            )
        )
        commit_or_500(self._db, "verify_email")

    def find_user_by_normalized_email(
        self, normalized_email: str
    ) -> EmailVerificationUser | None:
        row = self._db.execute(
            select(User).where(User.email_normalized == normalized_email)
        ).scalar_one_or_none()
        return _user_snapshot(row) if row is not None else None

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        self._db.execute(
            EmailVerificationToken.__table__.delete().where(
                EmailVerificationToken.user_id == user_id
            )
        )
        self._db.add(
            EmailVerificationToken(user_id=user_id, token=token, expires_at=expires_at)
        )
        commit_or_500(self._db, "resend_email_verification")
