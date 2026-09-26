"""Fila de una regeneración (migración 044).

Tipos portables (JSON con variante JSONB, UUID genérico): la tabla la crea la
migración en Postgres, y los tests la crean con `create_all` sobre SQLite.
`models.py` la re-exporta para que quede registrada en `Base.metadata`.
"""

import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from core.database import Base

_JSON = JSON().with_variant(JSONB(), "postgresql")


class RegenJob(Base):
    __tablename__ = "regen_jobs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    ova_id = Column(Uuid, ForeignKey("ovas.id", ondelete="CASCADE"), nullable=False, index=True)
    owner = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="running", server_default="running")
    step = Column(Text, nullable=False, default="queued", server_default="queued")
    total_phases = Column(Integer, nullable=False, default=1, server_default="1")
    prompt = Column(Text, nullable=False, default="", server_default="")
    instruction = Column(Text, nullable=True)
    phase_ids = Column(_JSON, nullable=False, default=list)
    attachments = Column(_JSON, nullable=False, default=list)
    new_version_number = Column(Integer, nullable=True)
    rag = Column(_JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    heartbeat_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
