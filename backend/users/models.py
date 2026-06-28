"""User and UserLink ORM models (users domain)."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class User(Base):
    __tablename__ = "users"

    id = _pk_column()
    # `email` conserva el correo como lo escribió el usuario (display/envío).
    # `email_normalized` es la llave canónica (minúsculas, sin +tag, sin puntos
    # en Gmail) usada para dedup y login.
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_normalized = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True))
    full_name = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
    email_verified = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    university_id = Column(Integer, unique=True, index=True)
    gender = Column(String(20))
    phone_number = Column(String(20), unique=True, index=True)
    # Per-user LLM generation config (general, applies to all the user's OVAs):
    # { "<tipo>": {"provider","model_id","timeout_s"} } for tipo in texto/codigo/
    # orquestador/razonamiento. Empty = system defaults.
    llm_settings = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Per-user enabled model allowlist: [{provider, model_id}, ...].
    # Only models in this list (plus system defaults) appear in the LLM settings
    # dropdowns. System defaults are always enabled regardless of this list.
    enabled_models = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    # Per-user OVA generation settings: {max_images, image_provider}.
    ova_settings = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Per-user theme preferences: {colorMode, designMode, palette}.
    theme_settings = Column(
        JSONB,
        nullable=False,
        server_default=text(
            '\'{"colorMode": "upao", "designMode": "upao", "palette": null}\'::jsonb'
        ),
    )
    # Per-user resource generation config: {"phase:id": {"key": value}}.
    resource_configs = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Per-user provider API keys (never logged, returned masked):
    # {groq, openrouter, opencode, siliconflow, runware, falai}
    user_api_keys = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    totp_secret = Column(String(64))
    totp_enabled = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    totp_backup_codes = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("UserRole", back_populates="user")
    ovas = relationship("Ova", back_populates="owner")


class UserLink(Base):
    """Permission-gated relation where one user can link another user."""

    __tablename__ = "user_links"

    id = _pk_column()
    owner_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    linked_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    invite_email = Column(String(255), nullable=True, index=True)
    code_hash = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
