import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base
from generation.error_log_model import OvaErrorLog  # noqa: F401  — registers ova_error_logs table
from generation.jobs_model import OvaJob, OvaJobResource  # noqa: F401  — registers ova_jobs tables


def _pk_column() -> Column:
    """UUID primary key shared by every table."""
    return Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


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
    theme_settings = Column(JSONB, nullable=False, server_default=text("'{\"colorMode\": \"upao\", \"designMode\": \"upao\", \"palette\": null}'::jsonb"))
    # Per-user provider API keys (never logged, returned masked):
    # {groq, openrouter, opencode, siliconflow, runware, falai}
    user_api_keys = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("UserRole", back_populates="user")
    ovas = relationship("Ova", back_populates="owner")


class Ova(Base):
    __tablename__ = "ovas"
    __table_args__ = (
        # Partial index speeds `WHERE deleted_at IS NULL` list queries (the
        # default soft-delete filter) without bloating with tombstones.
        Index(
            "idx_ovas_active", "user_id", "created_at", postgresql_where=text("deleted_at IS NULL")
        ),
    )

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, default="borrador", server_default="borrador")
    file_path = Column(Text)
    storage_key = Column(Text)  # Supabase Storage object key (new persistence path)
    current_version_id = Column(UUID(as_uuid=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="ovas")
    versions = relationship(
        "OvaVersion",
        back_populates="ova",
        foreign_keys="OvaVersion.ova_id",
        order_by="OvaVersion.version_number",
    )


class OvaVersion(Base):
    __tablename__ = "ova_versions"
    __table_args__ = (
        Index(
            "uq_one_active_version_per_ova",
            "ova_id",
            unique=True,
            postgresql_where=text("is_active = TRUE"),
        ),
    )

    id = _pk_column()
    ova_id = Column(
        UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number = Column(Integer, nullable=False)
    prompt = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ova = relationship("Ova", back_populates="versions", foreign_keys=[ova_id])
    phases = relationship(
        "OvaPhase",
        back_populates="version",
        order_by="OvaPhase.phase_order",
        cascade="all, delete-orphan",
    )


class OvaPhase(Base):
    __tablename__ = "ova_phases"

    id = _pk_column()
    version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ova_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phase_type = Column(String(30), nullable=False)
    phase_order = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    regenerated = Column(Boolean, nullable=False, default=False)
    resource_type_id = Column(Integer, nullable=True)  # 1-10 resource type per phase
    title = Column(String(120), nullable=True)  # human-readable label for SCORM nav
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    version = relationship("OvaVersion", back_populates="phases")
    micro_versions = relationship(
        "OvaPhaseVersion",
        back_populates="phase",
        order_by="OvaPhaseVersion.minor_number.desc()",
        cascade="all, delete-orphan",
    )


class OvaPhaseVersion(Base):
    """HU-029 — micro-version record per phase edit (vN.M minor versioning)."""

    __tablename__ = "ova_phase_versions"

    id = _pk_column()
    phase_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ova_phases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ova_id = Column(
        UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="CASCADE"), nullable=False, index=True
    )
    minor_number = Column(Integer, nullable=False, default=1)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    phase = relationship("OvaPhase", back_populates="micro_versions")


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
