"""ORM de la valoración del docente por recurso (`resource_feedback`, migración 049)."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base


class ResourceFeedbackRow(Base):
    __tablename__ = "resource_feedback"
    __table_args__ = (UniqueConstraint("user_id", "phase_id", name="uq_resource_feedback_user_phase"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ova_id = Column(UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="CASCADE"), nullable=False, index=True)
    # Sin FK: la valoración sobrevive a la regeneración/borrado de la fase.
    phase_id = Column(UUID(as_uuid=True), nullable=False)
    phase = Column(String(30), nullable=False)
    resource_type = Column(String(40))
    template_key = Column(String(40))
    params = Column(JSONB, nullable=False, server_default=sql_text("'{}'::jsonb"))
    rating = Column(String(4), nullable=False)
    reason = Column(String(30))
    comment = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
