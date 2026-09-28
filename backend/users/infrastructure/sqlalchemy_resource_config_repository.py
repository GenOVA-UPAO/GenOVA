"""Persistencia SQLAlchemy de la configuración de recursos por usuario.

El fallo de escritura conserva el manejo propio del endpoint original
(rollback + log + 500 con su mensaje), no `commit_or_500`.
"""

from __future__ import annotations

from uuid import UUID

import structlog
from sqlalchemy.orm import Session

from models import User
from users.domain.errors import ResourceConfigsNotSaved

logger = structlog.get_logger(__name__)


class SqlAlchemyResourceConfigRepository:
    """Implementa `ResourceConfigRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, user_id: UUID) -> dict:
        user = self._db.get(User, user_id)
        return user.resource_configs or {}

    def save(self, user_id: UUID, configs: dict) -> dict:
        user = self._db.get(User, user_id)
        user.resource_configs = configs
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("resource_configs write failed", user_id=user_id)
            raise ResourceConfigsNotSaved() from None

        # Tras el commit la sesión expira los atributos: la lectura recarga lo
        # persistido (idéntico al acceso post-commit del router original).
        return user.resource_configs
