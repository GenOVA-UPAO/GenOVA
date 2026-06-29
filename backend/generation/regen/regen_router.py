import threading
import time
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from generation.regen.regen_progress import _resolve_regen_stage
from generation.regen.regen_service import _finalize_edit, _regen_jobs, _regen_jobs_lock
from models import Ova, OvaPhase, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
)

router = APIRouter()

# Estimated seconds per resource for real LLM regeneration.
_EST_SECONDS_PER_PHASE = 60


class RegenRequest(BaseModel):
    prompt: str | None = None
    fase_ids: list[str] = Field(default_factory=list)


@router.post("/{ova_id}/regenerar")
def regenerate_ova(
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
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "forbidden",
                "message": "No tienes permiso para editar este OVA.",
            },
        )

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
    # 99% in one _EST_SECONDS_PER_PHASE window while real work keeps running.
    if payload.fase_ids:
        total_phases = len(payload.fase_ids)
    else:
        total_phases = db.scalar(
            select(func.count())
            .select_from(OvaPhase)
            .where(OvaPhase.version_id == active_version.id)
        )

    ova.status = "generando"
    db.commit()

    job_id = str(uuid.uuid4())
    with _regen_jobs_lock:
        _regen_jobs[job_id] = {
            "job_id": job_id,
            "ova_id": ova_id,
            "prompt": effective_prompt,
            "phase_ids": payload.fase_ids,
            "total_phases": max(int(total_phases or 1), 1),
            "started_at": time.time(),
            "status": "running",
        }

    thread = threading.Thread(target=_finalize_edit, args=(job_id, ova_id), daemon=True)
    thread.start()

    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "job_id": job_id,
            "message": "Regeneración iniciada.",
            "ova_status": "generando",
        },
    )


@router.get("/{ova_id}/regenerar/{job_id}/progress")
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
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    with _regen_jobs_lock:
        job = _regen_jobs.get(job_id)

    if not job or job.get("ova_id") != ova_id:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "job_not_found",
                "message": "Job de regeneración no encontrado.",
            },
        )

    job_status = job.get("status", "running")

    if job_status in ("success", "error"):
        percentage = 100
    else:
        n_phases = max(int(job.get("total_phases", 1)), 1)
        est_total = n_phases * _EST_SECONDS_PER_PHASE
        elapsed = max(0.0, time.time() - float(job["started_at"]))
        percentage = min(99, int((elapsed / est_total) * 100))

    stage = _resolve_regen_stage(percentage if job_status == "running" else 100)

    return {
        "job_id": job_id,
        "ova_id": ova_id,
        "status": job_status,
        "percentage": percentage,
        "stage": stage,
        "new_version_number": job.get("new_version_number"),
    }
