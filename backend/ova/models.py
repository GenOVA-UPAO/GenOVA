"""Ova, OvaVersion, OvaPhase, OvaPhaseVersion ORM models."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


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
