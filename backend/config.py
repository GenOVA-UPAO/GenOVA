"""Configuración central tipada y validada (pydantic-settings).

Reemplaza progresivamente los ``os.getenv`` dispersos. Por ahora cubre el núcleo
(auth, DB, CORS); el resto de módulos puede seguir usando ``os.getenv`` y coexisten.
``extra="ignore"`` evita que cualquier variable del ``.env`` no declarada aquí rompa
la carga. Importar ``settings`` valida al arranque (falla temprano si falta/está
mal una var crítica), igual que antes hacían security.py/database.py a mano.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRETS = {"", "change-me", "changeme", "secret", "test"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", case_sensitive=False
    )

    # --- Entorno / Auth ---
    env: str = "dev"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 1440
    auth_accept_bearer: bool = True
    cors_origins: str = ""

    # --- Base de datos ---
    database_url: str = ""
    db_pool_size: int = 10
    db_max_overflow: int = 10
    db_connect_timeout: int = 10

    @field_validator("jwt_secret")
    @classmethod
    def _strong_secret(cls, v: str) -> str:
        if v in _WEAK_SECRETS or len(v) < 16:
            raise ValueError(
                "JWT_SECRET debe ser un valor aleatorio fuerte (>=16 chars). "
                'Genera con: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return v


settings = Settings()
