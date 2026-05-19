import os
import threading
import time
import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, OvaVersion, User

from ova.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
    _ova_output_dir,
    _resolve_regen_stage,
    _version_to_dict,
    REGEN_DURATION_SECONDS,
)
from ova.regen_service import _finalize_edit, _regen_jobs, _regen_jobs_lock

router = APIRouter()


class SavePhaseRequest(BaseModel):
    content: str


class RegenRequest(BaseModel):
    prompt: str | None = None
    fase_ids: list[str] = Field(default_factory=list)


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/{ova_id}/editar")
def get_ova_editor(
    ova_id: str,
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
                "message": "No disponible mientras se genera el OVA.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    all_versions = (
        db.execute(
            select(OvaVersion)
            .where(OvaVersion.ova_id == ova_id)
            .order_by(OvaVersion.version_number.desc())
        )
        .scalars()
        .all()
    )

    return {
        "ova_id": str(ova.id),
        "title": ova.title,
        "status": ova.status,
        "current_version": _version_to_dict(active_version, include_phases=True),
        "version_history": [_version_to_dict(v) for v in all_versions],
    }


@router.patch("/{ova_id}/fases/{fase_id}")
def save_phase(
    ova_id: str,
    fase_id: str,
    payload: SavePhaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.content.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "content_required",
                "message": "El contenido no puede estar vacío.",
            },
        )

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
                "message": "No se puede editar mientras el OVA se está generando.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    phase = db.execute(
        select(OvaPhase).where(
            OvaPhase.id == fase_id, OvaPhase.version_id == active_version.id
        )
    ).scalar_one_or_none()

    if not phase:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "phase_not_found", "message": "Fase no encontrada."},
        )

    current_phases = list(
        db.execute(
            select(OvaPhase)
            .where(OvaPhase.version_id == active_version.id)
            .order_by(OvaPhase.phase_order)
        )
        .scalars()
        .all()
    )

    new_version_number = active_version.version_number + 1
    active_version.is_active = False

    new_version = OvaVersion(
        ova_id=ova_id,
        version_number=new_version_number,
        prompt=active_version.prompt,
        is_active=True,
    )
    db.add(new_version)
    db.flush()

    new_phases_data = []
    for p in current_phases:
        new_content = payload.content if str(p.id) == fase_id else p.content
        new_phase = OvaPhase(
            version_id=new_version.id,
            phase_type=p.phase_type,
            phase_order=p.phase_order,
            content=new_content,
            regenerated=False,
        )
        db.add(new_phase)
        new_phases_data.append(
            {"type": p.phase_type, "order": p.phase_order, "content": new_content}
        )

    db.flush()

    from scorm.service import build_scorm_zip_bytes

    output_dir = _ova_output_dir()
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{ova_id}_v{new_version_number}.zip")
    zip_bytes = build_scorm_zip_bytes(
        course_title=ova.title,
        module_title="OVA Generado por GenOVA",
        phases=new_phases_data,
    )
    with open(file_path, "wb") as f:
        f.write(zip_bytes)

    ova.file_path = file_path
    ova.current_version_id = new_version.id
    db.commit()

    return {
        "new_version_number": new_version_number,
        "version_id": str(new_version.id),
        "message": f"Fase guardada. Nueva versión v{new_version_number} creada.",
    }


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
            for p in db.execute(
                select(OvaPhase).where(OvaPhase.version_id == active_version.id)
            )
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

    ova.status = "generando"
    db.commit()

    job_id = str(uuid.uuid4())
    with _regen_jobs_lock:
        _regen_jobs[job_id] = {
            "job_id": job_id,
            "ova_id": ova_id,
            "prompt": effective_prompt,
            "phase_ids": payload.fase_ids,
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
        elapsed = REGEN_DURATION_SECONDS
        percentage = 100 if job_status == "success" else 100
    else:
        elapsed = max(0.0, time.time() - float(job["started_at"]))
        percentage = min(99, int((elapsed / REGEN_DURATION_SECONDS) * 100))

    stage = _resolve_regen_stage(percentage if job_status == "running" else 100)

    return {
        "job_id": job_id,
        "ova_id": ova_id,
        "status": job_status,
        "percentage": percentage if job_status != "success" else 100,
        "stage": stage,
        "new_version_number": job.get("new_version_number"),
    }


@router.get("/{ova_id}/versiones")
def list_ova_versions(
    ova_id: str,
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

    versions = (
        db.execute(
            select(OvaVersion)
            .where(OvaVersion.ova_id == ova_id)
            .order_by(OvaVersion.version_number.desc())
        )
        .scalars()
        .all()
    )

    return {
        "ova_id": ova_id,
        "versions": [_version_to_dict(v) for v in versions],
    }


@router.get("/{ova_id}/export-scorm")
def export_scorm(
    ova_id: str,
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

    if ova.status != "listo":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_not_ready", "message": "El OVA no está listo."},
        )

    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "file_not_found",
                "message": "Archivo SCORM no disponible.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    version_num = active_version.version_number if active_version else 1
    safe_title = (
        "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    )

    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}_v{version_num}.zip",
        media_type="application/zip",
    )
