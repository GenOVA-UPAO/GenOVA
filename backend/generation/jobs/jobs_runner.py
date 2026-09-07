"""EN-013 — background runner that generates a job's resources server-side.

Now powered by the Prometheus LangGraph (EP-5, EN-003). The runner creates
the graph state from the job params (reglas puras en `generation.domain.execution`),
invokes the compiled graph via el adaptador de infraestructura, and persists
the results back to OvaJobResource rows + materializes the OVA/SCORM.
"""

import threading
import uuid

import structlog
from sqlalchemy import select

from core.config import settings
from core.database import SessionLocal
from generation.domain.execution import build_graph_state, seed_plan
from generation.infrastructure.heartbeat import start_heartbeat
from generation.infrastructure.prometheus_engine import invoke_generation
from generation.jobs.jobs_progress import (
    MAX_ATTEMPTS,  # noqa: F401 — re-exported for test/monkeypatch access
    _finish_job,
    _has_done_resource,
    _persist_results,
    _release_ova_from_generating,
    _safe_mark_error,
    _start_job,
)
from models import OvaJob

logger = structlog.get_logger(__name__)

# Latido periódico de la fila ova_jobs mientras corre la generación (ver
# `generation.infrastructure.heartbeat`).
HEARTBEAT_S = settings.job_heartbeat_seconds


def _start_heartbeat(job_id: uuid.UUID) -> tuple[threading.Thread, threading.Event]:
    """Delega en el adaptador de infraestructura (edge users→prometheus vive ahí)."""
    return start_heartbeat(job_id, HEARTBEAT_S)


def run_job(job_id: uuid.UUID, only_resource_ids: list[uuid.UUID] | None = None) -> None:
    hb_stop: threading.Event | None = None
    try:
        # 1) Arranque + snapshot de params en una sesión CORTA (se cierra ya). No
        # se sostiene una conexión durante los minutos del grafo: el pooler de
        # Supabase evicta una conexión idle larga y el persist final reventaba con
        # 'SSL error: unexpected eof while reading' → job 'error' y OVA atascado en
        # 'generando' aunque la generación funcionó.
        prompt, params = _load_for_run(job_id)
        if params is None:
            return
        _, hb_stop = _start_heartbeat(job_id)

        results, errors = _generate(job_id, prompt, params, only_resource_ids)

        # 2) Persistencia post-generación en una sesión FRESCA (pool_pre_ping valida
        # la conexión al hacer checkout). any_done se decide por la BD, no por
        # len(results), para materializar también lo persistido en vivo si el grafo
        # abortó a mitad (rate-limit, etc.).
        _finalize(job_id, results, errors)
    finally:
        if hb_stop is not None:
            hb_stop.set()


def _load_for_run(job_id: uuid.UUID) -> tuple[str, dict | None]:
    db = SessionLocal()
    try:
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is None:
            return "", None
        _start_job(db, job)
        return job.prompt or "", dict(job.params or {})
    finally:
        db.close()


def _generate(
    job_id: uuid.UUID,
    prompt: str,
    params: dict,
    only_resource_ids: list[uuid.UUID] | None,
) -> tuple[list[dict], list[dict]]:
    # Sembrar el plan desde los recursos que el cliente eligió, para que el
    # concierge NO re-planifique por LLM e ignore la selección (lo que
    # desalineaba las filas OvaJobResource → quedaban pending/error y el job se
    # materializaba vacío). Sin resources (modo legacy) → el concierge planifica.
    phases_seed, phase_order_seed = seed_plan(params.get("resources") or [])
    initial_state = build_graph_state(
        prompt=prompt,
        params=params,
        job_id=job_id,
        only_resource_ids=only_resource_ids,
        phases_seed=phases_seed,
        phase_order_seed=phase_order_seed,
    )
    return invoke_generation(initial_state, str(job_id))


def _finalize(job_id: uuid.UUID, results: list[dict], errors: list[dict]) -> None:
    db = SessionLocal()
    try:
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is None:
            return
        if job.status == "canceled":
            _release_ova_from_generating(db, job)
            return
        _persist_results(db, job, results, errors)
        any_done = _has_done_resource(db, job.id)
        _finish_job(db, job, any_done)
    except Exception:
        logger.exception("Job runner crashed", job_id=job_id)
        _safe_mark_error(db, job_id)
    finally:
        db.close()
