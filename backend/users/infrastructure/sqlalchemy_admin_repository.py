"""Persistencia SQLAlchemy del cluster de administración de usuarios."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from models import User, UserRole
from users.domain.admin import AdminRoleSummary, AdminUserSummary


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
