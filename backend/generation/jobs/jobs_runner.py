"""EN-013 — background runner that generates a job's resources server-side.

Now powered by the Prometheus LangGraph (EP-5, EN-003). The runner creates
the graph state from the job params, invokes the compiled graph with LangGraph
checkpointing, and persists the results back to OvaJobResource rows + materializes
the OVA/SCORM.
"""

import logging
import threading
import uuid

from sqlalchemy import select

from core.config import settings
from core.database import SessionLocal
from generation.jobs.jobs_progress import (
    MAX_ATTEMPTS,  # noqa: F401 — re-exported for test/monkeypatch access
    _finish_job,
    _has_done_resource,
    _persist_results,
    _safe_mark_error,
    _start_job,
)
from models import OvaJob

logger = logging.getLogger(__name__)

# Latido periódico de la fila ova_jobs mientras corre la generación. El nodo de
# fase solo late al ENTRAR a la fase (runtime._touch_job); un recurso lento
# (p.ej. el modelo 'codigo' tarda 2-3 min) deja pasar >STALE_AFTER_SECONDS sin
# latido y el sweep marca el job 'interrupted' aunque está sano → el front lo
# relanza ("carga indefinida"). Un latido cada HEARTBEAT_S lo evita.
HEARTBEAT_S = settings.job_heartbeat_seconds


def _start_heartbeat(job_id: uuid.UUID) -> tuple[threading.Thread, threading.Event]:
    """Lanza un hilo daemon que bombea OvaJob.updated_at cada HEARTBEAT_S hasta
    que se señala el stop. Si el proceso muere, el hilo muere con él y el sweep
    vuelve a detectar el job como interrumpido (comportamiento deseado)."""
    from prometheus.engine.runtime import _touch_job

    stop = threading.Event()

    def _run() -> None:
        while not stop.wait(HEARTBEAT_S):
            _touch_job(str(job_id))

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    return t, stop


_PHASE_ORDER = ("engage", "explore", "explain", "elaborate", "evaluate")


def _seed_plan(resources: list[dict]) -> tuple[dict, list[str]]:
    """Construye (phases, phase_order) del estado del grafo desde los recursos
    pedidos por el cliente. ``resources`` = [{phase_type, resource_type}, ...]
    (snapshot en job.params). El concierge se salta cuando ambos vienen poblados.
    Devuelve ({}, []) si no hay recursos (modo legacy → concierge planifica)."""
    phases: dict[str, list[dict]] = {}
    for r in resources:
        phase = (r.get("phase_type") or "").strip().lower()
        if phase not in _PHASE_ORDER:
            continue
        raw = r.get("resource_type")
        try:
            rt: object = int(str(raw).strip())
        except (TypeError, ValueError):
            rt = raw
        items = phases.setdefault(phase, [])
        items.append({"resource_type": rt, "resource_order": len(items)})
    phase_order = [p for p in _PHASE_ORDER if p in phases]
    return phases, phase_order


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
    try:
        from prometheus.engine.graph import invoke_ova_generation

        # Sembrar el plan desde los recursos que el cliente eligió, para que el
        # concierge NO re-planifique por LLM e ignore la selección (lo que
        # desalineaba las filas OvaJobResource → quedaban pending/error y el job se
        # materializaba vacío). Sin resources (modo legacy) → el concierge planifica.
        phases_seed, phase_order_seed = _seed_plan(params.get("resources") or [])
        initial_state = {
            "prompt": prompt,
            "upload_ids": params.get("upload_ids") or [],
            "llm_config": params.get("llm_config") or {},
            "enabled_models": params.get("enabled_models") or [],
            "theme": params.get("theme") or {"color": "upao", "design": "upao"},
            "image_settings": params.get("image_settings") or {},
            "resource_configs": params.get("resource_configs") or {},
            "job_id": str(job_id),
            "phases": phases_seed,
            "phase_order": phase_order_seed,
            "results": [],
            "errors": [],
            "current_phase_idx": 0,
            "current_resource_idx": 0,
            "only_resource_ids": [str(r) for r in only_resource_ids] if only_resource_ids else None,
        }
        final_state = invoke_ova_generation(initial_state, str(job_id))
        return final_state.get("results", []), final_state.get("errors", [])
    except Exception:
        logger.exception("Prometheus graph failed for job %s", job_id)
        return [], []


def _finalize(job_id: uuid.UUID, results: list[dict], errors: list[dict]) -> None:
    db = SessionLocal()
    try:
        job = db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one_or_none()
        if job is None:
            return
        _persist_results(db, job, results, errors)
        any_done = _has_done_resource(db, job.id)
        _finish_job(db, job, any_done)
    except Exception:
        logger.exception("Job runner crashed for job %s", job_id)
        _safe_mark_error(db, job_id)
    finally:
        db.close()
