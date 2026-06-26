"""B2/B3 — arq job queue wiring for OVA generation.

When REDIS_URL is set, a generation run is enqueued to a durable arq queue
(processed by a separate worker — see backend/worker.py) instead of an inline
daemon thread, so a web redeploy or crash no longer drops in-flight generations.
Helpers here are sync-callable (the jobs router endpoints are sync) and the router
falls back to a thread when enqueue raises, so local dev works without a worker.
"""

import asyncio
import uuid

from arq import create_pool
from arq.connections import RedisSettings

from core.config import settings

GENERATION_TASK = "run_generation"


def redis_settings() -> RedisSettings:
    """arq Redis config from REDIS_URL (supports rediss:// TLS, e.g. Upstash)."""
    return RedisSettings.from_dsn(settings.redis_url)


async def _enqueue(job_id: uuid.UUID, only: list[uuid.UUID] | None) -> None:
    pool = await create_pool(redis_settings())
    try:
        await pool.enqueue_job(
            GENERATION_TASK,
            str(job_id),
            [str(x) for x in only] if only else None,
        )
    finally:
        try:
            await pool.aclose()
        except AttributeError:  # redis-py < 5 exposes close() instead of aclose()
            await pool.close()


def enqueue_generation(job_id: uuid.UUID, only: list[uuid.UUID] | None = None) -> None:
    """Enqueue a generation job on arq. Sync wrapper: runs its own event loop since
    the caller is a sync FastAPI endpoint executing in the threadpool."""
    asyncio.run(_enqueue(job_id, only))
