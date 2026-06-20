"""ORM models for EN-013 generation jobs.

Lives in its own module so `models.py` stays under the 200-line cap (C3), like
`error_log_model.py` for EN-012. `models.py` re-exports `OvaJob` /
`OvaJobResource`, so `import models` (done once on startup in `main.py`)
registers both tables in `Base.metadata`.

A job (`OvaJob`) is one generation; a resource (`OvaJobResource`) is one
generable element (text, image, code, exercise…) inside a 5E phase. Progress is
persisted per resource so a disconnect or a single failure never loses what is
already generated (R2, R4).
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base

# Allowed lifecycle states. Kept next to the models so service, runner and tests
# share a single source of truth.
JOB_STATUSES = ("queued", "running", "done", "error", "interrupted", "canceled")
RESOURCE_STATUSES = ("pending", "running", "done", "error")


def _job_pk() -> Column:
    return Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )


class OvaJob(Base):
    """One generation, tied to a user and (once materialized) an OVA (R1, R9)."""

    __tablename__ = "ova_jobs"

    id = _job_pk()
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    ova_id = Column(
        UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status = Column(String(20), nullable=False, default="queued", server_default="queued")
    prompt = Column(Text, nullable=False, default="", server_default="")
    params = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)


class OvaJobResource(Base):
    """One generable resource inside a phase; the unit of progress (R2, R4)."""

    __tablename__ = "ova_job_resources"
    __table_args__ = (
        Index("idx_ova_job_resources_order", "job_id", "phase_order", "resource_order"),
    )

    id = _job_pk()
    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ova_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phase_type = Column(String(30), nullable=False)
    phase_order = Column(Integer, nullable=False)
    resource_type = Column(String(40), nullable=True)
    resource_order = Column(Integer, nullable=False, default=0, server_default="0")
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
    attempts = Column(Integer, nullable=False, default=0, server_default="0")
    error_id = Column(UUID(as_uuid=True), nullable=True)
    ova_phase_id = Column(
        UUID(as_uuid=True), ForeignKey("ova_phases.id", ondelete="SET NULL"), nullable=True
    )
    content = Column(Text, nullable=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
