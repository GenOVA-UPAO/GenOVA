"""Persistencia SQLAlchemy de las claves de API por usuario.

La clave en claro vive y muere aquí: se guarda tal cual en el JSONB
`user_api_keys` y solo sale de este módulo enmascarada (`mask_key`).
Nada de esto se loguea salvo el user_id en el fallo de escritura.
"""

from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from llm.clients.key_resolver import mask_key
from llm.providers import ALL_PROVIDERS
from models import User
from users.domain.api_keys import merge_api_keys
from users.domain.errors import ApiKeysNotSaved

logger = structlog.get_logger(__name__)


class SqlAlchemyApiKeyRepository:
    """Implementa `ApiKeyRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_masked(self, user_id) -> dict:
        user = self._db.get(User, user_id)
        keys = user.user_api_keys or {}
        return {p: mask_key(keys.get(p)) for p in ALL_PROVIDERS}

    def save(self, user_id, updates: dict) -> dict:
        user = self._db.get(User, user_id)
        user.user_api_keys = merge_api_keys(user.user_api_keys or {}, updates)
        try:
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("API keys write failed", user_id=user_id)
            raise ApiKeysNotSaved() from None

        # Tras el commit la sesión expira: la lectura recarga lo persistido
        # (idéntico al acceso post-commit del router original).
        saved = user.user_api_keys or {}
        return {p: mask_key(saved.get(p)) for p in ALL_PROVIDERS}
