"""Persistencia SQLAlchemy del cluster de administración de usuarios."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from core.database import commit_or_500
from models import PasswordResetToken, Role, User, UserRole
from users.domain.admin import (
    AdminRoleSummary,
    AdminRoleUpdateResult,
    AdminTargetSummary,
    AdminUserSummary,
    assert_can_touch_target,
)
from users.domain.errors import UserNotFound


def _to_summary(u: User) -> AdminUserSummary:
    role = u.roles[0].role if u.roles else None
    return AdminUserSummary(
        id=str(u.id),
        email=u.email,
        full_name=u.full_name,
        university_id=u.university_id,
        gender=u.gender,
        phone_number=u.phone_number,
        is_active=u.is_active,
        failed_login_attempts=u.failed_login_attempts,
        locked_until=u.locked_until.isoformat() if u.locked_until else None,
        role=AdminRoleSummary(id=str(role.id), name=role.name) if role else None,
        created_at=u.created_at.isoformat() if u.created_at else None,
    )


class SqlAlchemyAdminUserRepository:
    """Implementa `AdminUserRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def count_users(self) -> int:
        return self._db.execute(select(func.count(User.id))).scalar() or 0

    def list_page(self, offset: int, limit: int) -> list[AdminUserSummary]:
        # joinedload eliminates N+1: roles + role loaded in one JOIN query.
        users_db = (
            self._db.execute(
                select(User)
                .options(joinedload(User.roles).joinedload(UserRole.role))
                .order_by(User.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
            .unique()
            .scalars()
            .all()
        )
        return [_to_summary(u) for u in users_db]

    def is_admin(self, user_id: UUID) -> bool:
        role = (
            self._db.execute(
                select(Role).join(UserRole).where(UserRole.user_id == user_id)
            )
            .scalars()
            .first()
        )
        return role is not None and role.name == "administrador"

    def assert_can_touch_target(self, caller_id: UUID, target_id: UUID) -> None:
        # Cortocircuito idéntico al helper original: la consulta del caller
        # solo corre si el destino es administrador.
        target_is_admin = self.is_admin(target_id)
        caller_is_admin = self.is_admin(caller_id) if target_is_admin else False
        assert_can_touch_target(caller_is_admin=caller_is_admin, target_is_admin=target_is_admin)

    def get_target(self, user_id: UUID) -> AdminTargetSummary:
        user = self._db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not user:
            raise UserNotFound()
        return AdminTargetSummary(id=str(user.id), email=user.email, full_name=user.full_name)

    def email_in_use(self, email: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User.id).where(User.email == email, User.id != excluding_user_id)
        ).first()
        return found is not None

    def phone_number_in_use(self, phone_number: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User.id).where(User.phone_number == phone_number, User.id != excluding_user_id)
        ).first()
        return found is not None

    def university_id_in_use(self, university_id: int, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User.id).where(User.university_id == university_id, User.id != excluding_user_id)
        ).first()
        return found is not None

    def update_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> None:
        user = self._db.get(User, user_id)
        user.full_name = full_name
        user.email = email
        user.university_id = university_id
        user.gender = gender
        user.phone_number = phone_number

        commit_or_500(self._db, op="update_user_profile")

    def get_role(self, role_id: UUID) -> AdminRoleSummary | None:
        role = self._db.execute(select(Role).where(Role.id == role_id)).scalar_one_or_none()
        if role is None:
            return None
        return AdminRoleSummary(id=str(role.id), name=role.name)

    def replace_role(self, user_id: UUID, role_id: UUID) -> AdminRoleUpdateResult:
        user = self._db.get(User, user_id)
        role = self._db.get(Role, role_id)

        self._db.execute(UserRole.__table__.delete().where(UserRole.user_id == user_id))
        self._db.flush()
        self._db.add(UserRole(user_id=user_id, role_id=role_id))
        commit_or_500(self._db, op="update_user_role")

        # Lecturas tras el commit: la sesión expira y recarga (igual que el
        # acceso post-commit del router original).
        return AdminRoleUpdateResult(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=AdminRoleSummary(id=str(role.id), name=role.name),
            updated_at=user.updated_at.isoformat() if user.updated_at else None,
        )

    def set_status(self, user_id: UUID, is_active: bool) -> bool:
        user = self._db.get(User, user_id)
        user.is_active = is_active
        commit_or_500(self._db, op="update_user_status")
        return user.is_active

    def unlock(self, user_id: UUID) -> None:
        user = self._db.get(User, user_id)
        user.failed_login_attempts = 0
        user.locked_until = None
        commit_or_500(self._db, op="unlock_user")

    def issue_reset_token(self, user_id: UUID) -> str:
        """Replace any existing reset tokens for the user with a fresh long token."""
        self._db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id))
        self._db.flush()
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(hours=24)
        self._db.add(PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at))
        commit_or_500(self._db, op="reset_password_email_token")
        return token
