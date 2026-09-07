"""Persistencia SQLAlchemy de los ajustes de generación por usuario."""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Role, User, UserRole
from users.domain.errors import EnabledModelsNotSaved, SettingsWriteFailed

logger = structlog.get_logger(__name__)


class SqlAlchemyUserSettingsRepository:
    """Implementa `UserSettingsRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_enabled_models(self, user_id) -> list:
        user = self._db.get(User, user_id)
        return user.enabled_models or []

    def save_enabled_models(self, user_id, clean: list) -> list:
        user = self._db.get(User, user_id)
        user.enabled_models = clean
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("enabled models write failed", user_id=user_id)
            raise EnabledModelsNotSaved() from None

        return clean

    def get_ova_settings(self, user_id) -> dict | None:
        user = self._db.get(User, user_id)
        return user.ova_settings

    def save_ova_settings(self, user_id, settings: dict) -> dict:
        user = self._db.get(User, user_id)
        user.ova_settings = settings
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("OVA settings write failed", user_id=user_id)
            raise SettingsWriteFailed() from None

        # Tras el commit la sesión expira: la lectura recarga lo persistido.
        return user.ova_settings

    def save_llm_settings(self, user_id, clean: dict) -> dict:
        user = self._db.get(User, user_id)
        user.llm_settings = clean
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("LLM settings write failed", user_id=user_id)
            raise SettingsWriteFailed() from None

        return user.llm_settings

    def has_own_llm_key(self, user_id, providers) -> bool:
        """True when user has a personal LLM API key, or holds the admin role."""
        user = self._db.get(User, user_id)
        own = user.user_api_keys or {}
        if any(own.get(p) for p in providers):
            return True
        return (
            self._db.execute(
                select(UserRole)
                .join(Role)
                .where(UserRole.user_id == user.id, Role.name == "administrador")
            )
            .scalars()
            .first()
            is not None
        )
