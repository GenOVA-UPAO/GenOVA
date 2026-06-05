"""EN-013 — HTTP layer for generation jobs (router → service → model).

No business logic lives here: it validates input, checks ownership, delegates to
`jobs_service` for persistence and to `jobs_runner` for the background thread.
All four endpoints require auth (cookie JWT) and the mutating one is rate-limited
(R8, C4). Error responses carry only generic messages + `error_id` — never
`str(e)` or tokens.
"""
import threading
import uuid

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import User
from ova import jobs_service
from ova.jobs_helpers import (
    StartJobRequest,
    build_resource_plan,
    job_params,
    job_to_dict,
)
from ova.jobs_runner import run_job
from rate_limit import limiter

router = APIRouter()


def _launch(job_id: uuid.UUID, only: list[uuid.UUID] | None = None) -> None:
    """Spawn the background runner in a daemon thread (its own Session)."""
    threading.Thread(target=run_job, args=(job_id, only), daemon=True).start()


def _parse_uuid(raw: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(raw)
    except (ValueError, TypeError):
        return None


@router.post("")
@limiter.limit("10/minute")
def start_job(
    request: Request,
    payload: StartJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a job + its resources, launch the runner, return {job_id, status}."""
    job = jobs_service.create_job(
        db,
        user_id=current_user.id,
        prompt=payload.prompt.strip(),
        params=job_params(payload),
        resources=build_resource_plan(payload),
    )
    _launch(job.id)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"job_id": str(job.id), "status": "queued"},
    )


@router.get("")
def find_job(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Locate the latest job of an OVA owned by the user (for HU-023)."""
    parsed = _parse_uuid(ova_id)
    if parsed is None:
        return _not_found("job_not_found", "No hay generación para este OVA.")
    job = jobs_service.find_job_by_ova(db, parsed, current_user.id)
    if job is None:
        return _not_found("job_not_found", "No hay generación para este OVA.")
    resources = jobs_service.list_resources(db, job.id)
    return job_to_dict(job, resources)


@router.get("/{job_id}")
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Job + resources state, by polling, independent of the starting connection."""
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    job = jobs_service.get_job(db, parsed, current_user.id)
    if job is None:
        return _not_found("job_not_found", "Job no encontrado.")
    resources = jobs_service.list_resources(db, job.id)
    return job_to_dict(job, resources)


@router.post("/{job_id}/resume")
def resume_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Continue only the pending/error resources of an interrupted/error job (R7)."""
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    job = jobs_service.get_job(db, parsed, current_user.id)
    if job is None:
        return _not_found("job_not_found", "Job no encontrado.")
    if job.status == "running":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "job_running", "message": "El job ya está en ejecución."},
        )
    pending = jobs_service.resumable_resource_ids(db, job.id)
    if not pending:
        return {"job_id": str(job.id), "status": job.status, "resumed": 0}
    jobs_service.mark_job_resuming(db, job)
    _launch(job.id, pending)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"job_id": str(job.id), "status": "running", "resumed": len(pending)},
    )


def _not_found(error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": error, "message": message},
    )
