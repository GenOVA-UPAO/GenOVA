"""Persistencia SQLAlchemy del caso de uso de registro."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.domain.errors import EmailAlreadyRegistered
from auth.domain.user import RegisteredUser
from core.database import commit_or_500
from models import EmailVerificationToken, PlatformConfig, Role, User, UserRole


class SqlAlchemyRegistrationRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

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
        role_name = (
            select(PlatformConfig.value)
            .where(PlatformConfig.key == "default_registration_role")
            .scalar_subquery()
        )
        role = self._db.execute(
            select(Role).where(Role.name == func.coalesce(role_name, "usuarios_prueba"))
        ).scalar_one_or_none()

        user = User(
            email=email,
            email_normalized=normalized_email,
            password_hash=password_hash,
            full_name=full_name,
            email_verified=email_verified,
        )
        self._db.add(user)
        try:
            self._db.flush()
            if role is not None:
                self._db.add(UserRole(user_id=user.id, role_id=role.id))
            if verification_token is not None:
                assert verification_expires_at is not None
                self._db.add(
                    EmailVerificationToken(
                        user_id=user.id,
                        token=verification_token,
                        expires_at=verification_expires_at,
                    )
                )
        except IntegrityError:
            self._db.rollback()
            raise EmailAlreadyRegistered() from None

        snapshot = RegisteredUser(id=str(user.id), email=str(user.email), full_name=user.full_name)
        commit_or_500(self._db, "register_user")
        return snapshot
