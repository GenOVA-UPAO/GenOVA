from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from generation.errors.error_log_model import (
    OvaErrorLog,  # noqa: F401  — registers ova_error_logs table
)
from generation.jobs.jobs_model import (  # noqa: F401  — registers ova_jobs tables
    OvaJob,
    OvaJobResource,
)
from models_base import _pk_column
from models_ova import Ova, OvaPhase, OvaPhaseVersion, OvaVersion  # noqa: F401


class User(Base):
    __tablename__ = "users"

    id = _pk_column()
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    failed_login_attempts = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True))
    full_name = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)
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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("UserRole", back_populates="user")
    ovas = relationship("Ova", back_populates="owner")


class Session(Base):
    __tablename__ = "sessions"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="sessions")


class Role(Base):
    __tablename__ = "roles"

    id = _pk_column()
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    permissions = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    users = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


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


class LabResult(Base):
    __tablename__ = "lab_results"

    id = _pk_column()
    phase = Column(String(20), nullable=False)
    resource_type = Column(Integer, nullable=False)
    concept = Column(String(500), nullable=False)
    prompt_text = Column(Text, nullable=False)
    model_id = Column(String(100), nullable=False)
    provider = Column(String(50), nullable=False)
    html_content = Column(Text)
    raw_json = Column(JSONB)
    quality_checks = Column(JSONB)
    was_selected = Column(Boolean, nullable=False, default=False)
    generation_ms = Column(Integer)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class RagChunk(Base):
    """One embedded chunk from a user upload. The `embedding` column is a
    pgvector column managed via raw SQL in `backend/rag/store.py`; SQLAlchemy
    treats it as opaque text-equivalent here (we only read it via raw queries)."""

    __tablename__ = "rag_chunks"
    __table_args__ = (Index("idx_rag_chunks_expires_at", "expires_at"),)

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    upload_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    ova_id = Column(UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="SET NULL"), nullable=True)
    source_filename = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    # embedding column is vector(768) — handled in raw SQL; not declared here.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="password_reset_tokens")


class PlatformConfig(Base):
    """Admin-only key-value store for platform-level API keys and config."""

    __tablename__ = "platform_config"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CatalogCache(Base):
    """One row per provider (groq | openrouter) holding the raw API response
    from the model-list endpoints. Upserted on each catalog refresh with a 24h
    TTL so we can rebuild the merged catalog even if both providers are
    unreachable."""

    __tablename__ = "catalog_cache"

    id = _pk_column()
    provider = Column(String(20), unique=True, nullable=False, index=True)
    raw_data = Column(JSONB, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
