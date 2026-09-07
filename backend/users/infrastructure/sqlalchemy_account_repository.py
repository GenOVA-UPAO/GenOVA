"""Persistencia SQLAlchemy de la seguridad de la cuenta propia.

Incluye la protección de único administrador y la anonimización de PII que
antes vivían en `users/application/account_service.py` (mismas consultas y
mismo orden, ahora señalando errores de dominio en vez de HTTP).
"""

from __future__ import annotations

import uuid
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import Role, User, UserRole
from users.domain.account import UserAccount
from users.domain.errors import SoleAdminRemoval


class SqlAlchemyUserAccountRepository:
    """Implementa `UserAccountRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, user_id: UUID) -> UserAccount | None:
        user = self._db.get(User, user_id)
        if user is None:
            return None
        return UserAccount(id=str(user.id), password_hash=user.password_hash)

    def update_password(self, user_id: UUID, password_hash: str) -> None:
        user = self._db.get(User, user_id)
        user.password_hash = password_hash
        commit_or_500(self._db, "change_password")

    def assert_not_sole_admin(self, user_id: UUID) -> None:
        user_roles = (
            self._db.execute(
                select(Role.name)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.user_id == user_id)
            )
            .scalars()
            .all()
        )
        if "administrador" not in user_roles:
            return

        total_admins = self._db.execute(
            select(func.count(UserRole.user_id))
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(Role.name == "administrador", User.is_active)
        ).scalar()
        if total_admins and total_admins <= 1:
            raise SoleAdminRemoval()

    def deactivate_and_anonymize(self, user_id: UUID) -> None:
        """Soft-delete del usuario: bloquea la baja de único admin y limpia el PII."""
        user = self._db.get(User, user_id)

        uid_suffix = str(uuid.uuid4())[:8]
        user.is_active = False
        user.email = f"deleted_{user.id}@{uid_suffix}.removed.local"
        user.full_name = "[eliminado]"
        user.phone_number = None
        user.university_id = None

        commit_or_500(self._db, "delete_account")
