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
from core.database import get_db
from core.rate_limit import limiter
from generation.jobs import jobs_service
from generation.jobs.jobs_helpers import (
    ResumeRequest,
    StartJobRequest,
    build_resource_plan,
    job_params,
    job_to_dict,
)
from generation.jobs.jobs_runner import run_job
from models import User

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
    from llm.clients.key_resolver import resolve_key

    ova_settings = current_user.ova_settings or {}
    image_provider = ova_settings.get("image_provider", "huggingface")
    resolved_image_settings = {
        "max_images": ova_settings.get("max_images", 2),
        "provider": image_provider,
        "api_key": resolve_key(
            image_provider, current_user.user_api_keys or {}, db, current_user.id
        ),
    }

    job = jobs_service.create_job(
        db,
        user_id=current_user.id,
        prompt=payload.prompt.strip(),
        params=job_params(
            payload,
            current_user.llm_settings,
            current_user.enabled_models,
            resolved_image_settings,
        ),
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


@router.get("/{job_id}/resources/{resource_id}/content")
def get_resource_content(
    job_id: str,
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the generated HTML of a `done` resource (preview, R1). Owner only.

    Kept off `GET /jobs/{id}` (which never leaks content, R8); this dedicated
    endpoint serves the body of a single completed resource to its owner.
    """
    job_uuid = _parse_uuid(job_id)
    res_uuid = _parse_uuid(resource_id)
    if job_uuid is None or res_uuid is None:
        return _not_found("resource_not_found", "Recurso no encontrado.")
    job = jobs_service.get_job(db, job_uuid, current_user.id)
    if job is None:
        return _not_found("resource_not_found", "Recurso no encontrado.")
    resource = jobs_service.get_resource(db, job.id, res_uuid)
    if resource is None:
        return _not_found("resource_not_found", "Recurso no encontrado.")
    if resource.status != "done" or not resource.content:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "resource_not_ready", "message": "El recurso aún no está listo."},
        )
    return {
        "id": str(resource.id),
        "phase_type": resource.phase_type,
        "resource_type": resource.resource_type,
        "content": resource.content,
    }


@router.post("/{job_id}/resume")
@limiter.limit("10/minute")
def resume_job(
    request: Request,
    job_id: str,
    payload: ResumeRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Continue the pending/error resources of an interrupted/error job (R7).

    Optional `resource_ids` body resumes only those that belong to the job (single
    R6 / batch R7 retry); no body resumes every pending/error resource (legacy).
    """
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
    targets, error = _resolve_resume_targets(db, job.id, payload)
    if error is not None:
        return error
    if not targets:
        return {"job_id": str(job.id), "status": job.status, "resumed": 0}
    jobs_service.mark_job_resuming(db, job)
    _launch(job.id, targets)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={"job_id": str(job.id), "status": "running", "resumed": len(targets)},
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


def _not_found(error: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"error": error, "message": message},
    )
