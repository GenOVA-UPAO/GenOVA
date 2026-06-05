"""ORM model for EN-012 generation error logs.

Lives in its own module so `models.py` stays under the 200-line cap (C3).
`models.py` re-exports `OvaErrorLog`, so `import models` (done once on startup
in `main.py`) registers this table in `Base.metadata` like every other model.
"""
import uuid

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func, text

from database import Base

# Allowed error categories (R3). Kept here next to the model so the service and
# tests share a single source of truth.
ERROR_CATEGORIES = ("model_error", "token_limit", "timeout", "validation", "other")
DEFAULT_CATEGORY = "other"


class OvaErrorLog(Base):
    """One sanitized record per generation failure.

    `error_id` is the opaque Error ID exposed to the user (EN-013/HU-022) and
    used to look the row up in the Supabase dashboard. `job_id` /
    `job_resource_id` are nullable and FK-free: their tables ship with EN-013.
    """

    __tablename__ = "ova_error_logs"

    error_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    ova_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    job_id = Column(UUID(as_uuid=True), nullable=True)
    job_resource_id = Column(UUID(as_uuid=True), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    error_category = Column(
        String(20), nullable=False, default=DEFAULT_CATEGORY, server_default=DEFAULT_CATEGORY
    )
    message = Column(Text, nullable=False, default="", server_default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
