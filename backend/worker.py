"""B2 — arq worker entrypoint for OVA generation.

Run as a SEPARATE process from the web service:

    arq worker.WorkerSettings

On Railway, add a second service with that start command sharing the API's env
(DATABASE_URL, REDIS_URL, provider keys). It pops generation jobs off the arq
queue and runs the existing sync runner in a thread, so the heavy multi-agent LLM
work (Prometheus) never blocks the web process and survives a web redeploy.
"""

import asyncio
import sys
import uuid

import structlog
from arq.connections import RedisSettings

from core.config import settings
from generation.jobs.jobs_runner import run_job
from generation.jobs.queue import redis_settings

# GN-05: en consolas Windows (cp1252) el logging de errores con caracteres no
# mapeables moría con UnicodeEncodeError y enmascaraba el traceback real.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

logger = structlog.get_logger(__name__)


async def run_generation(ctx, job_id: str, only: list[str] | None = None) -> None:
    """arq task: delegate to the existing sync runner off the event loop."""
    only_uuids = [uuid.UUID(x) for x in only] if only else None
    await asyncio.to_thread(run_job, uuid.UUID(job_id), only_uuids)


def _pending_resource_ids(db, job_id: uuid.UUID) -> list[uuid.UUID]:
    from sqlalchemy import select

    from models import OvaJobResource

    return [
        r.id
        for r in db.execute(select(OvaJobResource).where(OvaJobResource.job_id == job_id)).scalars()
        if r.status != "done"
    ]


def _as_utc(dt):
    from datetime import UTC

    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _find_orphans_to_requeue() -> list[tuple[uuid.UUID, list[uuid.UUID]]]:
    """Find stuck jobs: stale ``running`` (dead worker) or fresh ``queued`` (no worker).

    Only reclaim queued jobs younger than QUEUED_STALE_AFTER_SECONDS — older
    zombies stay for the lazy sweep (interrupted) instead of flooding Redis.
    """
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select, update

    from core.database import SessionLocal
    from generation.jobs.jobs_service import QUEUED_STALE_AFTER_SECONDS, STALE_AFTER_SECONDS
    from models import OvaJob

    now = datetime.now(UTC)
    running_stale = now - timedelta(seconds=STALE_AFTER_SECONDS)
    queued_fresh_after = now - timedelta(seconds=QUEUED_STALE_AFTER_SECONDS)
    out: list[tuple[uuid.UUID, list[uuid.UUID]]] = []
    db = SessionLocal()
    try:
        orphans = db.execute(select(OvaJob).where(OvaJob.status == "running")).scalars().all()
        for job in orphans:
            updated = _as_utc(job.updated_at)
            if updated is not None and updated > running_stale:
                continue  # otro worker lo tiene vivo (heartbeat reciente)
            # Claim atómico ANTES de re-encolar: evita doble ejecución con el
            # sweep lazy del web (_sweep_if_stale → interrupted + resume).
            claimed = db.execute(
                update(OvaJob)
                .where(
                    OvaJob.id == job.id,
                    OvaJob.status == "running",
                    OvaJob.updated_at <= running_stale,
                )
                .values(updated_at=now)
            )
            db.commit()
            if claimed.rowcount == 0:
                continue
            out.append((job.id, _pending_resource_ids(db, job.id)))

        # REDIS_URL sin worker → jobs quedan "En cola…". Solo los recientes.
        for job in db.execute(select(OvaJob).where(OvaJob.status == "queued")).scalars().all():
            updated = _as_utc(job.updated_at) or _as_utc(job.created_at)
            if updated is None or updated < queued_fresh_after:
                continue
            pending = _pending_resource_ids(db, job.id)
            if pending:
                out.append((job.id, pending))
        return out
    finally:
        db.close()


async def resume_orphans(ctx) -> None:
    """F5.2 — al arrancar, re-encolar jobs huérfanos (running estancado / queued)."""
    try:
        orphans = await asyncio.to_thread(_find_orphans_to_requeue)
    except Exception:  # noqa: BLE001 — el resume nunca impide arrancar el worker
        logger.exception("resume_orphans falló")
        return
    for job_id, pending in orphans:
        if not pending:
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
