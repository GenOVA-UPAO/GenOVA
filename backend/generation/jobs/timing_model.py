"""Duración histórica de generación por tipo de recurso (estimación de tiempo restante).

Una fila por recurso generado con éxito. La mediana de las últimas N filas por
(fase, tipo) alimenta el «≈ 1 min restante» del progreso; no guarda contenido.
"""

import uuid

from sqlalchemy import Column, DateTime, Float, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from core.database import Base


class ResourceTiming(Base):
    __tablename__ = "resource_timings"
    __table_args__ = (
        Index("idx_resource_timings_key", "phase_type", "resource_type", "created_at"),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    phase_type = Column(String(30), nullable=False)
    resource_type = Column(String(40), nullable=False)
    seconds = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
