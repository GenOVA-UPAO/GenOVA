"""Persistencia SQLAlchemy del perfil propio (ajustes de perfil y tema)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import User
from users.domain.profile import UserProfile


def _to_profile(user: User) -> UserProfile:
    return UserProfile(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        university_id=user.university_id,
        gender=user.gender,
        phone_number=user.phone_number,
        theme_settings=user.theme_settings,
        created_at=user.created_at.isoformat() if user.created_at else None,
        updated_at=user.updated_at.isoformat() if user.updated_at else None,
    )


class SqlAlchemyUserProfileRepository:
    """Implementa `UserProfileRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def email_in_use(self, email: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.email == email, User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def phone_number_in_use(self, phone_number: str, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.phone_number == phone_number, User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def university_id_in_use(self, university_id: int, excluding_user_id: UUID) -> bool:
        found = self._db.execute(
            select(User).where(User.university_id == university_id, User.id != excluding_user_id)
        ).scalar_one_or_none()
        return found is not None

    def save_profile(
        self,
        user_id: UUID,
        *,
        full_name: str,
        email: str,
        university_id: int | None,
        gender: str | None,
        phone_number: str | None,
    ) -> UserProfile:
        # Misma instancia que `get_current_user` (identity map de la sesión):
        # la mutación en sitio y el refresh reproducen el flujo del router.
        user = self._db.get(User, user_id)
        user.full_name = full_name
        user.email = email
        user.university_id = university_id
        user.gender = gender
        user.phone_number = phone_number

        commit_or_500(self._db, "update_profile")
        self._db.refresh(user)
        return _to_profile(user)

    def save_theme(
        self, user_id: UUID, *, color_mode: str, design_mode: str, palette: dict | None
    ) -> dict:
        user = self._db.get(User, user_id)
        user.theme_settings = {
            "colorMode": color_mode,
            "designMode": design_mode,
            "palette": palette,
        }
        commit_or_500(self._db, "update_theme")
        self._db.refresh(user)
        return user.theme_settings
