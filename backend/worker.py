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

from arq.connections import RedisSettings

from core.config import settings
from generation.jobs.jobs_runner import run_job
from generation.jobs.queue import redis_settings


async def run_generation(ctx, job_id: str, only: list[str] | None = None) -> None:
    """arq task: delegate to the existing sync runner off the event loop."""
    only_uuids = [uuid.UUID(x) for x in only] if only else None
    await asyncio.to_thread(run_job, uuid.UUID(job_id), only_uuids)


class WorkerSettings:
    functions = [run_generation]
    # Default RedisSettings() keeps the module import-safe when REDIS_URL is unset
    # (e.g. tooling/CI); the worker is only ever launched with REDIS_URL configured.
    redis_settings: RedisSettings = redis_settings() if settings.redis_url else RedisSettings()
    max_jobs = settings.arq_max_jobs
    job_timeout = 3600  # una generación 5E completa puede tardar minutos; tope 1h
