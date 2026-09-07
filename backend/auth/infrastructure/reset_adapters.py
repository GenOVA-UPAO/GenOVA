"""Persistencia SQLAlchemy para recuperación de contraseñas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.domain.user import PasswordResetTokenRecord, PasswordResetUser
from core.database import commit_or_500
from models import PasswordResetToken, User


class SqlAlchemyPasswordResetTokenRepository:
    def __init__(self, db: Session) -> None:
        self._db = db
        self._user_row: User | None = None

    def find_active_user(self, normalized_email: str) -> PasswordResetUser | None:
        row = self._db.execute(
            select(User).where(User.email_normalized == normalized_email, User.is_active)
        ).scalar_one_or_none()
        if row is None:
            return None
        return PasswordResetUser(
            id=row.id,
            email=normalized_email,
            full_name=row.full_name,
        )

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        self._db.execute(
            PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user_id)
        )
        self._db.add(
            PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at)
        )
        commit_or_500(self._db, "request_password_reset")

    def find_by_token(self, token: str) -> PasswordResetTokenRecord | None:
        row = self._db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        ).scalar_one_or_none()
        if row is None:
            return None
        return PasswordResetTokenRecord(
            user_id=row.user_id,
            token=str(row.token),
            expires_at=row.expires_at,
        )

    def delete(self, token: str) -> None:
        self._db.execute(
            PasswordResetToken.__table__.delete().where(PasswordResetToken.token == token)
        )
        commit_or_500(self._db, "delete_expired_password_reset_token")

    def find_user(self, user_id: UUID) -> bool:
        self._user_row = self._db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        return self._user_row is not None

    def apply_new_password(self, user_id: UUID, password_hash: str) -> None:
        assert self._user_row is not None and self._user_row.id == user_id
        self._user_row.password_hash = password_hash
        self._user_row.failed_login_attempts = 0
        self._user_row.locked_until = None
        self._db.execute(
            PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user_id)
        )
        commit_or_500(self._db, "reset_password")
