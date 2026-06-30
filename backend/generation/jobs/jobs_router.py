"""EN-013 — HTTP layer for generation jobs (router → service → model).

No business logic lives here: it validates input, checks ownership, delegates to
`jobs_service` for persistence and to `jobs_runner` for the background thread.
All four endpoints require auth (cookie JWT) and the mutating one is rate-limited
(R8, C4). Error responses carry only generic messages + `error_id` — never
`str(e)` or tokens.
"""

import logging

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
from generation.jobs.jobs_router_helpers import (
    _cancel_or_409,
    _launch,
    _not_found,
    _parse_uuid,
    _resolve_resume_targets,
)
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)


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
    image_provider = ova_settings.get("image_provider", "cloudflare")
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


@router.post("/{job_id}/cancel")
@limiter.limit("10/minute")
def cancel_job(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Abort a queued or running job. Returns 409 if already terminal."""
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    return _cancel_or_409(db, parsed, current_user.id)


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
