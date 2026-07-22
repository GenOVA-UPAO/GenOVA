from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from generation.regen.regen_jobs import regen_progress_dto, start_regen
from generation.regen.regen_service import _finalize_edit
from models import Ova, OvaPhase, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
)
from ova.helpers import forbidden_response

router = APIRouter(tags=["Generación"])


class RegenRequest(BaseModel):
    prompt: str | None = None
    fase_ids: list[str] = Field(default_factory=list)


@router.post("/{ova_id}/regenerar", summary="Regenerar los recursos de una OVA")
@limiter.limit("10/minute")
def regenerate_ova(
    request: Request,
    ova_id: str,
    payload: RegenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if not _is_ova_owner(ova, current_user):
        return forbidden_response("No tienes permiso para editar este OVA.")

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "El OVA ya está en proceso de generación.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    if payload.fase_ids:
        valid_phase_ids = {
            str(p.id)
            for p in db.execute(select(OvaPhase).where(OvaPhase.version_id == active_version.id))
            .scalars()
            .all()
        }
        invalid = [fid for fid in payload.fase_ids if fid not in valid_phase_ids]
        if invalid:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "invalid_fase_ids",
                    "message": "Algunos IDs de fases no pertenecen a este OVA.",
                },
            )

    effective_prompt = (
        payload.prompt.strip()
        if payload.prompt and payload.prompt.strip()
        else active_version.prompt
    )

    # Phases actually being regenerated: an explicit subset, else every phase of
    # the active version ("Regenerar OVA completo"). Used to pace the progress
    # estimate — without it a full regen counts 0 phases and the bar saturates at
    # 99% in one estimation window while real work keeps running.
    if payload.fase_ids:
        total_phases = len(payload.fase_ids)
    else:
        total_phases = db.scalar(
            select(func.count())
            .select_from(OvaPhase)
            .where(OvaPhase.version_id == active_version.id)
        )

    job_id = start_regen(
        db, ova, effective_prompt, payload.fase_ids, total_phases or 1, worker=_finalize_edit
    )

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "job_id": job_id,
            "message": "Regeneración iniciada.",
            "ova_status": "generando",
        },
    )


@router.get(
    "/{ova_id}/regenerar/{job_id}/progress", summary="Consultar el progreso de una regeneración"
)
def get_regen_progress(
    ova_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if not _is_ova_owner(ova, current_user):
        return forbidden_response()

    progress = regen_progress_dto(job_id, ova_id)
    if progress is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": "Job de regeneración no encontrado.",
            },
        )
    return progress
