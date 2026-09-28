"""Persistencia SQLAlchemy de la configuración de plataforma (PlatformConfig).

Las claves de plataforma NUNCA salen de este módulo en claro: `get_masked_keys`
devuelve el mapa ya enmascarado y `save_keys` solo recibe {provider: valor}.
Nada se loguea salvo el fallo de escritura (sin valores).
"""

from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from llm.clients.key_resolver import mask_key
from llm.providers import ALL_PROVIDERS
from models import PlatformConfig
from users.domain.errors import PlatformConfigNotSaved

logger = structlog.get_logger(__name__)

_DB_KEY = "{}_api_key".format


class SqlAlchemyPlatformSettingsRepository:
    """Implementa `PlatformSettingsRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def get_masked_keys(self) -> dict:
        rows = {r.key: r.value for r in self._db.query(PlatformConfig).all()}
        return {p: mask_key(rows.get(_DB_KEY(p))) for p in ALL_PROVIDERS}

    def save_keys(self, updates: dict) -> None:
        try:
            for provider, value in updates.items():
                db_key = _DB_KEY(provider)
                if value.strip():
                    row = self._db.get(PlatformConfig, db_key)
                    if row:
                        row.value = value.strip()
                    else:
                        self._db.add(PlatformConfig(key=db_key, value=value.strip()))
                else:
                    row = self._db.get(PlatformConfig, db_key)
                    if row:
                        self._db.delete(row)
            self._db.commit()
        except Exception:
            self._db.rollback()
            logger.exception("platform config write failed")
            raise PlatformConfigNotSaved() from None

    def get_registration_mode(self) -> str:
        """Return the default role assigned to new self-registered users."""
        row = self._db.get(PlatformConfig, "default_registration_role")
        return row.value if row else "usuarios_prueba"

    def save_registration_mode(self, role_name: str) -> None:
        row = self._db.get(PlatformConfig, "default_registration_role")
        if row:
            row.value = role_name
        else:
            self._db.add(PlatformConfig(key="default_registration_role", value=role_name))
        self._db.commit()
