"""Lanza una regeneración: cola arq si hay Redis, si no un hilo daemon.

Mismo criterio que `generation.infrastructure.job_launcher` para la generación:
con REDIS_URL la regeneración la ejecuta el worker arq (worker.py), así que un
redeploy del web ya no la corta; sin Redis, o si encolar falla, corre en un hilo
de este proceso para que el entorno local funcione sin worker. Es viable sin
tocar la arquitectura porque el ejecutor solo necesita el id: todo lo demás lo
lee de la fila `regen_jobs`, y el reclamo atómico (`claim_regen`) impide que la
misma regeneración se ejecute dos veces (reintento de arq incluido).
"""

from __future__ import annotations

import threading

import structlog

from core.config import settings
from generation.regen.regen_service import _finalize_edit

logger = structlog.get_logger(__name__)


def launch_regen(job_id: str, ova_id: str) -> None:
    if settings.redis_url:
        try:
            from generation.infrastructure.arq_queue import enqueue_regen

            enqueue_regen(job_id, ova_id)
            return
        except Exception:
            logger.exception("arq enqueue of regen failed; running inline", job_id=job_id)
    threading.Thread(
        target=_finalize_edit, args=(job_id, ova_id), daemon=True, name=f"regen-{job_id[:8]}"
    ).start()
