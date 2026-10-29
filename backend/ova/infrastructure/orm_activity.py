"""ORM de los datos estructurados por recurso (`ova_resource_activities`, migración 051).

Una fila por HTML generado con una plantilla del motor (`ova_engine`): clave de la
plantilla, JSON de texto validado y params. Se busca por el sha256 del HTML de la
fase (`scorm.domain.activities.content_hash`): si el docente lo edita deja de
coincidir y la exportación vuelve a usar el HTML.
"""

import uuid

from sqlalchemy import CHAR, Column, DateTime, Index, String, UniqueConstraint
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base


class ResourceActivityRow(Base):
    __tablename__ = "ova_resource_activities"
    __table_args__ = (
        UniqueConstraint("content_sha256", name="uq_ova_resource_activities_sha"),
        Index("idx_ova_resource_activities_template", "template_key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sql_text("gen_random_uuid()"))
    content_sha256 = Column(CHAR(64), nullable=False)
    template_key = Column(String(40), nullable=False)
    phase_type = Column(String(30), nullable=False)
    resource_type = Column(String(40))
    data = Column(JSONB, nullable=False)
    params = Column(JSONB, nullable=False, server_default=sql_text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
