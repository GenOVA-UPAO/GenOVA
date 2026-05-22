import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    roles = relationship("UserRole", back_populates="user")
    ovas = relationship("Ova", back_populates="owner")


class Ova(Base):
    __tablename__ = "ovas"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, default="borrador", server_default="borrador")
    file_path = Column(Text)
    current_version_id = Column(UUID(as_uuid=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="ovas")
    versions = relationship("OvaVersion", back_populates="ova", foreign_keys="OvaVersion.ova_id",
                            order_by="OvaVersion.version_number")


class OvaVersion(Base):
    __tablename__ = "ova_versions"
    __table_args__ = (
        Index("uq_one_active_version_per_ova", "ova_id", unique=True,
              postgresql_where=text("is_active = TRUE")),
    )

    id = _pk_column()
    ova_id = Column(UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    prompt = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    ova = relationship("Ova", back_populates="versions", foreign_keys=[ova_id])
    phases = relationship("OvaPhase", back_populates="version", order_by="OvaPhase.phase_order",
                          cascade="all, delete-orphan")


class OvaPhase(Base):
    __tablename__ = "ova_phases"

    id = _pk_column()
    version_id = Column(UUID(as_uuid=True), ForeignKey("ova_versions.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    phase_type = Column(String(30), nullable=False)
    phase_order = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    regenerated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    version = relationship("OvaVersion", back_populates="phases")


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


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="password_reset_tokens")
