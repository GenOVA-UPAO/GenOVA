"""EN-013 — HTTP layer for generation jobs (router → service → model).

No business logic lives here: it validates input, checks ownership, delegates to
`jobs_service` for persistence and to `jobs_runner` for the background thread.
All four endpoints require auth (cookie JWT) and the mutating one is rate-limited
(R8, C4). Error responses carry only generic messages + `error_id` — never
`str(e)` or tokens.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from generation.application.dto import CreateJobInput, ResumeJobInput
from generation.container import GenerationUseCases, build_generation
from generation.domain.errors import GenerationError
from generation.interface.http.error_map import generation_error_to_response
from generation.jobs.jobs_helpers import (
    ResumeRequest,
    StartJobRequest,
    build_resource_plan,
)
from generation.jobs.jobs_router_helpers import (
    _not_found,
    _parse_uuid,
)
from generation.jobs.jobs_router_helpers import (
    _resolve_resume_targets as _impl_resolve_resume_targets,
)
from models import User

router = APIRouter(tags=["Generación"])


def _resolve_resume_targets(*args, **kwargs):
    """Re-export for tests that import the helper from this module (B4)."""
    return _impl_resolve_resume_targets(*args, **kwargs)


@router.post("", summary="Encolar un trabajo de generación de OVA")
@limiter.limit("10/minute")
def start_job(
    request: Request,
    payload: StartJobRequest,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Create a job + its resources, launch the runner, return {job_id, status}."""
    try:
        result = uc.create_job.execute(
            CreateJobInput(
                user_id=current_user.id,
                prompt=payload.prompt.strip(),
                resource_plan=build_resource_plan(payload),
                upload_ids=list(payload.upload_ids),
                phases=list(payload.phases),
                resources=[r.model_dump() for r in payload.resources],
                theme=payload.theme.model_dump(),
                resource_configs=dict(payload.resource_configs),
                llm_settings=current_user.llm_settings or {},
                enabled_models=current_user.enabled_models or [],
                ova_settings=current_user.ova_settings or {},
                user_api_keys=current_user.user_api_keys or {},
            )
        )
    except GenerationError as err:
        return generation_error_to_response(err)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "job_id": result.job_id,
            "ova_id": result.ova_id,
            "status": result.status,
        },
    )


@router.get("", summary="Buscar un trabajo por criterios")
def find_job(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Locate the latest job of an OVA owned by the user (for HU-023)."""
    parsed = _parse_uuid(ova_id)
    if parsed is None:
        return _not_found("job_not_found", "No hay generación para este OVA.")
    try:
        view = uc.find_job_by_ova.execute(parsed, current_user.id)
    except GenerationError as err:
        return generation_error_to_response(err)
    return view.as_dict()


@router.get("/{job_id}", summary="Consultar el estado de un trabajo")
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Job + resources state, by polling, independent of the starting connection."""
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    try:
        view = uc.get_job_status.execute(parsed, current_user.id)
    except GenerationError as err:
        return generation_error_to_response(err)
    return view.as_dict()


@router.get(
    "/{job_id}/resources/{resource_id}/content",
    summary="Obtener el contenido de un recurso generado",
)
def get_resource_content(
    job_id: str,
    resource_id: str,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Return the generated HTML of a `done` resource (preview, R1). Owner only.

    Kept off `GET /jobs/{id}` (which never leaks content, R8); this dedicated
    endpoint serves the body of a single completed resource to its owner.
    """
    job_uuid = _parse_uuid(job_id)
    res_uuid = _parse_uuid(resource_id)
    if job_uuid is None or res_uuid is None:
        return _not_found("resource_not_found", "Recurso no encontrado.")
    try:
        view = uc.get_resource_content.execute(job_uuid, res_uuid, current_user.id)
    except GenerationError as err:
        return generation_error_to_response(err)
    return view.as_dict()


@router.post("/{job_id}/cancel", summary="Cancelar un trabajo en curso")
@limiter.limit("10/minute")
def cancel_job(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Abort a queued or running job. Returns 409 if already terminal."""
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    try:
        result = uc.cancel_job.execute(parsed, current_user.id)
    except GenerationError as err:
        return generation_error_to_response(err)
    return JSONResponse(content={"job_id": result.job_id, "status": result.status})


@router.post("/{job_id}/resume", summary="Reanudar un trabajo interrumpido")
@limiter.limit("10/minute")
def resume_job(
    request: Request,
    job_id: str,
    payload: ResumeRequest | None = None,
    current_user: User = Depends(get_current_user),
    uc: GenerationUseCases = Depends(build_generation),
):
    """Continue the pending/error resources of an interrupted/error job (R7).

    Optional `resource_ids` body resumes only those that belong to the job (single
    R6 / batch R7 retry); no body resumes every pending/error resource (legacy).
    """
    parsed = _parse_uuid(job_id)
    if parsed is None:
        return _not_found("job_not_found", "Job no encontrado.")
    resource_ids = tuple(payload.resource_ids) if payload and payload.resource_ids else ()
    try:
        result = uc.resume_job.execute(
            ResumeJobInput(
                job_id=parsed,
                user_id=current_user.id,
                resource_ids=resource_ids,
            )
        )
    except GenerationError as err:
        return generation_error_to_response(err)
    body = {"job_id": result.job_id, "status": result.status, "resumed": result.resumed}
    if result.accepted:
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=body)
    return body
