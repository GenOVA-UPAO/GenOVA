"""Helpers for the generation-jobs HTTP layer (launch, parsing, resume targets).

Kept out of jobs_router so the router file stays a thin endpoint list.
"""

import logging
import threading
import uuid

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from core.config import settings
from generation.jobs import jobs_service
from generation.jobs.jobs_helpers import ResumeRequest
from generation.jobs.jobs_model import JOB_TERMINAL
from generation.jobs.jobs_runner import run_job

logger = logging.getLogger(__name__)


def _launch(job_id: uuid.UUID, only: list[uuid.UUID] | None = None) -> None:
    """Start a generation run. With REDIS_URL set, enqueue on arq (durable, runs in
    the worker process); otherwise — or if enqueue fails — run inline in a daemon
    thread so local dev and a Redis outage still work (B2/B3)."""
    if settings.redis_url:
        try:
            from generation.jobs.queue import enqueue_generation

            enqueue_generation(job_id, only)
            return
        except Exception:
            logger.exception("arq enqueue failed for job %s; running inline", job_id)
    threading.Thread(target=run_job, args=(job_id, only), daemon=True).start()


def _parse_uuid(raw: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        return None


def _not_found(error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": error, "message": message},
    )


def _resolve_resume_targets(
    db: Session, job_id: uuid.UUID, payload: ResumeRequest | None
) -> tuple[list[uuid.UUID], JSONResponse | None]:
    """Pick the resources to resume. Validates a client subset belongs to the job (B4)."""
    requested = list(payload.resource_ids) if payload and payload.resource_ids else []
    if not requested:
        return jobs_service.resumable_resource_ids(db, job_id), None
    parsed: list[uuid.UUID] = []
    for raw in requested:
        rid = _parse_uuid(raw)
        if rid is None:
            return [], _not_found("resource_not_found", "Recurso no encontrado.")
        parsed.append(rid)
    owned = jobs_service.resource_ids_in_job(db, job_id)
    if any(rid not in owned for rid in parsed):
        return [], _not_found("resource_not_found", "Recurso no encontrado.")
    # R6/R7: drop ids already `done` so relaunching a done resource is inert.
    return jobs_service.resumable_subset(db, job_id, parsed), None


def _cancel_or_409(db: Session, job_id: uuid.UUID, user_id: uuid.UUID) -> JSONResponse:
    """Cancel a job owned by user_id. Returns the new state or a 404/409 response."""
    job = jobs_service.get_job(db, job_id, user_id)
    if job is None:
        return _not_found("job_not_found", "Job no encontrado.")
    if job.status in JOB_TERMINAL:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "job_not_running", "message": "El job ya no está en curso."},
        )
    jobs_service.cancel_job(db, job)
    return JSONResponse(content={"job_id": str(job.id), "status": "canceled"})
