"""B2 — arq worker entrypoint for OVA generation.

Run as a SEPARATE process from the web service:

    arq worker.WorkerSettings

On Railway, add a second service with that start command sharing the API's env
(DATABASE_URL, REDIS_URL, provider keys). It pops generation jobs off the arq
queue and runs the existing sync runner in a thread, so the heavy multi-agent LLM
work (Prometheus) never blocks the web process and survives a web redeploy.
"""

import asyncio
import uuid

import structlog
from arq.connections import RedisSettings

from core.config import settings
from generation.jobs.jobs_runner import run_job
from generation.jobs.queue import redis_settings

logger = structlog.get_logger(__name__)


async def run_generation(ctx, job_id: str, only: list[str] | None = None) -> None:
    """arq task: delegate to the existing sync runner off the event loop."""
    only_uuids = [uuid.UUID(x) for x in only] if only else None
    await asyncio.to_thread(run_job, uuid.UUID(job_id), only_uuids)


async def resume_orphans(ctx) -> None:
    """F5.2 — al arrancar el worker, re-encolar jobs que quedaron 'running'
    huérfanos (el proceso murió a mitad de generación). Solo se regeneran los
    recursos NO persistidos: los done incrementales se conservan.
    """

    def _find_and_requeue() -> list[tuple[uuid.UUID, list[uuid.UUID]]]:
        from datetime import UTC, datetime, timedelta

        from sqlalchemy import select

        from core.database import SessionLocal
        from models import OvaJob, OvaJobResource

        stale_cutoff = datetime.now(UTC) - timedelta(seconds=180)
        out: list[tuple[uuid.UUID, list[uuid.UUID]]] = []
        db = SessionLocal()
        try:
            orphans = (
                db.execute(select(OvaJob).where(OvaJob.status == "running"))
                .scalars()
                .all()
            )
            for job in orphans:
                updated = job.updated_at
                if updated is not None and updated.tzinfo is None:
                    updated = updated.replace(tzinfo=UTC)
                if updated is not None and updated > stale_cutoff:
                    continue  # otro worker lo tiene vivo (heartbeat reciente)
                pending = [
                    r.id
                    for r in db.execute(
                        select(OvaJobResource).where(OvaJobResource.job_id == job.id)
                    ).scalars()
                    if r.status != "done"
                ]
                out.append((job.id, pending))
            return out
        finally:
            db.close()

    try:
        orphans = await asyncio.to_thread(_find_and_requeue)
    except Exception:  # noqa: BLE001 — el resume nunca impide arrancar el worker
        logger.exception("resume_orphans falló")
        return
    for job_id, pending in orphans:
        if not pending:
            # Todo persistido: no hay nada que regenerar — lo cierra el sweep lazy.
            continue
        await ctx["redis"].enqueue_job("run_generation", str(job_id), [str(x) for x in pending])
        print(f"[worker] resume: job {job_id} re-encolado ({len(pending)} recursos pendientes)")


class WorkerSettings:
    functions = [run_generation]
    on_startup = resume_orphans
    # Default RedisSettings() keeps the module import-safe when REDIS_URL is unset
    # (e.g. tooling/CI); the worker is only ever launched with REDIS_URL configured.
    redis_settings: RedisSettings = redis_settings() if settings.redis_url else RedisSettings()
    max_jobs = settings.arq_max_jobs
    job_timeout = 3600  # una generación 5E completa puede tardar minutos; tope 1h
