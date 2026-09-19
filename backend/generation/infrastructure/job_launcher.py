"""Lanza un job de generación (cola arq o hilo daemon)."""

from __future__ import annotations

import threading
from uuid import UUID

import structlog

from core.config import settings
from generation.jobs.jobs_runner import run_job

logger = structlog.get_logger(__name__)


class ThreadOrQueueJobLauncher:
    def launch(self, job_id: UUID, only: list[UUID] | None = None) -> None:
        launch_job(job_id, only)


def launch_job(job_id: UUID, only: list[UUID] | None = None) -> None:
    """With REDIS_URL set, enqueue on arq; otherwise (or if enqueue fails)
    run inline in a daemon thread so local dev and a Redis outage still work.
    """
    if settings.redis_url:
        try:
            from generation.infrastructure.arq_queue import enqueue_generation

            enqueue_generation(job_id, only)
            return
        except Exception:
            logger.exception("arq enqueue failed; running inline", job_id=job_id)
    threading.Thread(target=run_job, args=(job_id, only), daemon=True).start()
