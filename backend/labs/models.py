"""LabResult ORM model (labs domain)."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


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
