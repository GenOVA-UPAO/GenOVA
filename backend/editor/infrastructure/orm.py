"""Modelo ORM de persistencia para telemetría de feedback docente."""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base


class EditorFeedback(Base):
    __tablename__ = "editor_feedback"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=sql_text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ova_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ovas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    fase_id = Column(String(100), nullable=True)
    instruccion = Column(Text, nullable=True)
    bloques_antes = Column(JSONB, nullable=False, server_default=sql_text("'[]'::jsonb"))
    intencion_propuesta = Column(JSONB, nullable=True)
    intencion_final = Column(JSONB, nullable=True)
    resultado = Column(String(30), nullable=False, index=True)
    confianza = Column(Float, nullable=True)
    backend = Column(String(50), nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
