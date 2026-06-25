"""Shared helpers for the admin user-management routers.

Keeps the user-facing modules narrow and consistent. All HTTPExceptions emitted
from here return generic, non-leaking messages — never echo raw SQLAlchemy
errors to the caller.
"""

import logging
import os
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Role, User, UserRole

logger = logging.getLogger(__name__)

APP_URL = os.getenv("APP_URL", "http://localhost:5173")
GENDER_CHOICES = {"masculino", "femenino", "otro"}


def parse_uuid(raw: str) -> UUID:
    try:
        return UUID(raw)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        ) from exc


def is_admin_user(user_id: UUID, db: Session) -> bool:
    role = (
        db.execute(select(Role).join(UserRole).where(UserRole.user_id == user_id)).scalars().first()
    )
    return role is not None and role.name == "administrador"


def assert_can_touch_target(*, caller: User, target_id: UUID, db: Session) -> None:
    """Block hierarchy violations: non-admin callers cannot mutate admin users."""
    if is_admin_user(target_id, db) and not is_admin_user(caller.id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )


def get_target_user(target_id: UUID, db: Session) -> User:
    user = db.execute(select(User).where(User.id == target_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return user


def commit_or_500(db: Session, *, op: str) -> None:
    """Commit and convert any DB failure into a generic 500. The exception
    detail is logged but never sent to the client."""
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Admin DB write failed during %s", op)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo completar la operación. Intenta de nuevo.",
        ) from None


def normalize_gender(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip().lower()
    if value not in GENDER_CHOICES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sexo debe ser 'masculino', 'femenino' u 'otro'.",
        )
    return value


def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    cleaned = value.replace("+", "").replace(" ", "").replace("-", "")
    if not cleaned.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de teléfono solo debe contener dígitos y '+'.",
        )
    return value
