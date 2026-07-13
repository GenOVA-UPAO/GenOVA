"""Business logic for account deletion: sole-admin protection + PII anonymization."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from models import Role, User, UserRole


def _assert_not_sole_admin(db: Session, user: User) -> None:
    user_roles = (
        db.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user.id)
        )
        .scalars()
        .all()
    )
    if "administrador" not in user_roles:
        return

    total_admins = db.execute(
        select(func.count(UserRole.user_id))
        .join(Role, Role.id == UserRole.role_id)
        .join(User, User.id == UserRole.user_id)
        .where(Role.name == "administrador", User.is_active)
    ).scalar()
    if total_admins and total_admins <= 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes eliminar tu cuenta porque eres el único administrador activo.",
        )


def anonymize_and_deactivate(db: Session, user: User) -> None:
    """Soft-delete `user`: block sole-admin removal, then scrub PII in place."""
    _assert_not_sole_admin(db, user)

    uid_suffix = str(uuid.uuid4())[:8]
    user.is_active = False
    user.email = f"deleted_{user.id}@{uid_suffix}.removed.local"
    user.full_name = "[eliminado]"
    user.phone_number = None
    user.university_id = None
