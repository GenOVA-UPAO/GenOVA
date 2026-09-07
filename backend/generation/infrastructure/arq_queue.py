"""B2/B3 — adaptador de cola arq para la generación de OVAs.

Cuando REDIS_URL está configurado, una generación se encola en una cola arq
duradera (procesada por un worker aparte — ver backend/worker.py) en lugar de
un hilo daemon inline, para que un redeploy o crash web ya no pierda
generaciones en curso. Los helpers son sync-callable (los endpoints de jobs
son sync) y el launcher hace fallback a hilo si enqueue lanza, así el dev
local funciona sin worker.
"""

from __future__ import annotations

import asyncio
from uuid import UUID

from arq import create_pool
from arq.connections import RedisSettings

from core.config import settings

GENERATION_TASK = "run_generation"


def redis_settings() -> RedisSettings:
    """arq Redis config from REDIS_URL (supports rediss:// TLS, e.g. Upstash)."""
    return RedisSettings.from_dsn(settings.redis_url)


async def _enqueue(job_id: UUID, only: list[UUID] | None) -> None:
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


def enqueue_generation(job_id: UUID, only: list[UUID] | None = None) -> None:
    """Enqueue a generation job on arq. Sync wrapper: runs its own event loop since
    the caller is a sync FastAPI endpoint executing in the threadpool."""
    asyncio.run(_enqueue(job_id, only))
