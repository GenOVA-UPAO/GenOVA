"""Persistencia SQLAlchemy de los ajustes de generación por usuario."""

from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from models import User
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
