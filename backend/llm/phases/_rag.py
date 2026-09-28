"""Recuperación RAG común de los endpoints de un recurso (`/api/agents/<fase>`).

Los cinco routers repetían la misma función y se habían desviado del resto del
sistema: no respetaban `RAG_DISABLED` ni comprobaban que los documentos fueran
del usuario (con el id de un documento ajeno se recuperaba su contenido).
"""

from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from rag import retrieve_context

logger = structlog.get_logger(__name__)


def retrieve_phase_context(
    db: Session, query: str, upload_ids: list[str], *, user_id: str, fase: str
) -> str:
    """Bloque de contexto listo para `generate_resource` ("" si no hay material)."""
    if not upload_ids:
        return ""
    retrieved = retrieve_context(db, query, upload_ids, user_id=user_id)
    if retrieved.contexto:
        logger.info(
            "RAG retrieved chunks",
            fase=fase,
            chunk_count=retrieved.chunks,
            sources=[s["filename"] for s in retrieved.sources],
            concept=query[:60],
        )
    return retrieved.contexto
