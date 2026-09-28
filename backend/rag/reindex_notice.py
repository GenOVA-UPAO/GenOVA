"""Aviso al arrancar: fragmentos del RAG embebidos con otro embedder.

Tras cambiar de modelo de embeddings (p. ej. gemini-embedding-2-preview →
gemini-embedding-2) los vectores guardados quedan en otro espacio: la búsqueda
vectorial devuelve ruido sin dar error y la rama léxica lo disimula. Por eso,
al arrancar, se cuentan los fragmentos cuyo `rag_chunks.embedding_model` no es
la `fingerprint` del embedder activo y, si hay alguno, se registra un warning
con el comando que los reindexa.

Solo cuenta (el ensayo de `ReindexChunks`, sin llamar al embedder): re-embeber
en el arranque costaría dinero y cuota y retrasaría el servicio; eso se lanza a
mano con `scripts/reindex_rag.py --apply` (ver readme, «Reindexar embeddings»).
Nunca lanza: un fallo aquí no puede impedir que el backend arranque.
"""

from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from rag.application.errors import EmbedderError
from rag.application.ports import EmbedderPort, ReindexStorePort
from rag.application.use_cases import ReindexChunks
from rag.config import is_enabled

logger = structlog.get_logger(__name__)

DRY_RUN_CMD = "cd backend && python scripts/reindex_rag.py"
APPLY_CMD = "cd backend && python scripts/reindex_rag.py --apply"


def warn_if_stale_embeddings(
    db: Session,
    *,
    embedder: EmbedderPort | None = None,
    store: ReindexStorePort | None = None,
) -> int | None:
    """Fragmentos desfasados respecto al embedder activo (y los avisa), o None si
    no se pudo comprobar (RAG apagado, sin Postgres, sin embedder o error)."""
    if not is_enabled():
        return None
    if store is None:
        bind = db.get_bind()
        if bind.dialect.name != "postgresql":  # rag_chunks/pgvector solo en Postgres
            return None
        from rag.infrastructure.reindex_store import PgVectorReindexStore

        store = PgVectorReindexStore(db)
    try:
        if embedder is None:
            from rag.infrastructure.embedders import get_embedder

            embedder = get_embedder()
        report = ReindexChunks(embedder, store).execute(dry_run=True)
    except EmbedderError as exc:
        # Sin GEMINI_API_KEY no hay embedder activo con el que comparar.
        logger.info("rag embeddings check skipped", reason=str(exc))
        return None
    except Exception:  # noqa: BLE001 — aviso best-effort, nunca tumba el arranque
        db.rollback()
        logger.exception("rag embeddings check failed (continuing)")
        return None

    if report.stale:
        logger.warning(
            "RAG: hay fragmentos embebidos con otro modelo; la búsqueda vectorial "
            "devuelve ruido hasta reindexarlos",
            stale=report.stale,
            total=report.total,
            active_embedder=report.fingerprint,
            # NULL = anterior a la migración 043 (origen desconocido): también se reindexa.
            by_model={(model or "(sin registrar)"): n for model, n in report.by_model.items()},
            dry_run=DRY_RUN_CMD,
            reindex=APPLY_CMD,
        )
    return report.stale
