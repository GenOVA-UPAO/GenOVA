import logging
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
from database import SessionLocal, get_db
from models import Ova, OvaPhase, OvaVersion, User

router = APIRouter()
logger = logging.getLogger(__name__)

_regen_jobs: dict[str, dict] = {}
_regen_jobs_lock = threading.Lock()

REGEN_DURATION_SECONDS = int(os.getenv("OVA_GENERATION_DURATION_SECONDS", "14"))

SIMULATED_REGEN_CONTENT = {
    "motivacion": "Descubre por qué el aprendizaje automático está revolucionando múltiples industrias y cómo puedes aplicarlo en tu campo de estudio.",
    "contenido": "Explora los fundamentos teóricos y prácticos del tema. Analiza casos reales, datasets representativos y metodologías validadas en la industria.",
    "explicacion": "Comprende en profundidad los algoritmos clave, sus supuestos matemáticos y cuándo aplicar cada enfoque según el problema a resolver.",
    "actividad": "Diseña y ejecuta un mini-proyecto aplicando lo aprendido. Trabaja con datos reales y documenta tus decisiones de modelado.",
    "evaluacion": "Evalúa tu comprensión respondiendo preguntas sobre conceptos clave, selección de modelos y análisis de resultados obtenidos.",
}

PROGRESS_STAGES = [
    (10, "Iniciando regeneración"),
    (35, "Procesando contenido"),
    (65, "Generando fases seleccionadas"),
    (90, "Reconstruyendo paquete SCORM"),
    (100, "Finalizando"),
]


def _resolve_regen_stage(pct: int) -> str:
    for threshold, label in PROGRESS_STAGES:
        if pct <= threshold:
            return label
    return PROGRESS_STAGES[-1][1]


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR", default)


def _is_ova_owner(ova: Ova, user: User) -> bool:
    return str(ova.user_id) == str(user.id)


def _get_active_version(ova_id, db: Session) -> OvaVersion | None:
    return db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
    ).scalar_one_or_none()


def _ensure_version_exists(ova: Ova, db: Session) -> OvaVersion:
    """Creates a v1 version for OVAs that pre-date the versioning feature."""
    from ova.router import DEFAULT_PHASE_CONTENT

    version = OvaVersion(
        ova_id=ova.id,
        version_number=1,
        prompt=ova.description or ova.title,
        is_active=True,
    )
    db.add(version)
    db.flush()

    for phase_data in DEFAULT_PHASE_CONTENT:
        db.add(OvaPhase(
            version_id=version.id,
            phase_type=phase_data["type"],
            phase_order=phase_data["order"],
            content=phase_data["content"],
            regenerated=False,
        ))

    ova.current_version_id = version.id
    db.commit()
    db.refresh(version)
    return version


def _phase_to_dict(phase: OvaPhase) -> dict:
    return {
        "id": str(phase.id),
        "phase_type": phase.phase_type,
        "phase_order": phase.phase_order,
        "content": phase.content,
        "regenerated": phase.regenerated,
    }


def _version_to_dict(version: OvaVersion, include_phases: bool = False) -> dict:
    data = {
        "id": str(version.id),
        "version_number": version.version_number,
        "prompt": version.prompt,
        "is_active": version.is_active,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }
    if include_phases:
        data["phases"] = [_phase_to_dict(p) for p in version.phases]
    return data


def _finalize_edit(job_id: str, ova_id: str) -> None:
    """Background thread: waits, then creates new version and rebuilds SCORM."""
    db = SessionLocal()
    try:
        time.sleep(REGEN_DURATION_SECONDS)

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if not job:
                return
            job["status"] = "finalizing"

        prompt = job["prompt"]
        phase_ids_to_regen = set(job.get("phase_ids", []))
        regen_all = not phase_ids_to_regen

        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if not ova:
            return

        current_version = _get_active_version(ova_id, db)
        if not current_version:
            current_version = _ensure_version_exists(ova, db)

        # Load current phases
        current_phases = list(db.execute(
            select(OvaPhase)
            .where(OvaPhase.version_id == current_version.id)
            .order_by(OvaPhase.phase_order)
        ).scalars().all())

        new_version_number = current_version.version_number + 1

        # Deactivate current version
        current_version.is_active = False

        # Create new version
        new_version = OvaVersion(
            ova_id=ova_id,
            version_number=new_version_number,
            prompt=prompt,
            is_active=True,
        )
        db.add(new_version)
        db.flush()

        new_phases_data = []
        for phase in current_phases:
            should_regen = regen_all or str(phase.id) in phase_ids_to_regen
            new_content = (
                SIMULATED_REGEN_CONTENT.get(phase.phase_type, phase.content)
                if should_regen
                else phase.content
            )
            new_phase = OvaPhase(
                version_id=new_version.id,
                phase_type=phase.phase_type,
                phase_order=phase.phase_order,
                content=new_content,
                regenerated=should_regen,
            )
            db.add(new_phase)
            new_phases_data.append({"type": phase.phase_type, "order": phase.phase_order, "content": new_content})

        db.flush()

        # Rebuild SCORM zip
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

        ova.status = "listo"
        ova.file_path = file_path
        ova.current_version_id = new_version.id
        db.commit()

        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "success"
                job["completed_at"] = time.time()
                job["new_version_number"] = new_version_number

    except Exception as exc:
        logger.error("Edit regen failed for OVA %s: %s", ova_id, exc)
        try:
            ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
            if ova:
                ova.status = "error"
                db.commit()
        except Exception:
            pass
        with _regen_jobs_lock:
            job = _regen_jobs.get(job_id)
            if job:
                job["status"] = "error"
    finally:
        db.close()


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
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden",
                                     "message": "No tienes permiso para editar este OVA."})

    if ova.status == "generando":
        return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                            content={"error": "ova_generating",
                                     "message": "No disponible mientras se genera el OVA."})

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    all_versions = db.execute(
        select(OvaVersion)
        .where(OvaVersion.ova_id == ova_id)
        .order_by(OvaVersion.version_number.desc())
    ).scalars().all()

    return {
        "ova_id": str(ova.id),
        "title": ova.title,
        "status": ova.status,
        "current_version": _version_to_dict(active_version, include_phases=True),
        "version_history": [_version_to_dict(v) for v in all_versions],
    }


class SavePhaseRequest(BaseModel):
    content: str


@router.patch("/{ova_id}/fases/{fase_id}")
def save_phase(
    ova_id: str,
    fase_id: str,
    payload: SavePhaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.content.strip():
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                            content={"error": "content_required", "message": "El contenido no puede estar vacío."})

    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden",
                                     "message": "No tienes permiso para editar este OVA."})

    if ova.status == "generando":
        return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                            content={"error": "ova_generating",
                                     "message": "No se puede editar mientras el OVA se está generando."})

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    # Verify phase belongs to this version
    phase = db.execute(
        select(OvaPhase).where(OvaPhase.id == fase_id, OvaPhase.version_id == active_version.id)
    ).scalar_one_or_none()

    if not phase:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "phase_not_found", "message": "Fase no encontrada."})

    current_phases = list(db.execute(
        select(OvaPhase)
        .where(OvaPhase.version_id == active_version.id)
        .order_by(OvaPhase.phase_order)
    ).scalars().all())

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
        new_phases_data.append({"type": p.phase_type, "order": p.phase_order, "content": new_content})

    db.flush()

    # Rebuild SCORM
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
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden",
                                     "message": "No tienes permiso para editar este OVA."})

    if ova.status == "generando":
        return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                            content={"error": "ova_generating",
                                     "message": "El OVA ya está en proceso de generación."})

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    # Validate fase_ids belong to current version
    if payload.fase_ids:
        valid_phase_ids = {
            str(p.id) for p in db.execute(
                select(OvaPhase).where(OvaPhase.version_id == active_version.id)
            ).scalars().all()
        }
        invalid = [fid for fid in payload.fase_ids if fid not in valid_phase_ids]
        if invalid:
            return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                                content={"error": "invalid_fase_ids",
                                         "message": "Algunos IDs de fases no pertenecen a este OVA."})

    effective_prompt = payload.prompt.strip() if payload.prompt and payload.prompt.strip() else active_version.prompt

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
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden", "message": "Sin permisos."})

    with _regen_jobs_lock:
        job = _regen_jobs.get(job_id)

    if not job or job.get("ova_id") != ova_id:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "job_not_found", "message": "Job de regeneración no encontrado."})

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
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden", "message": "Sin permisos."})

    versions = db.execute(
        select(OvaVersion)
        .where(OvaVersion.ova_id == ova_id)
        .order_by(OvaVersion.version_number.desc())
    ).scalars().all()

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
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=status.HTTP_403_FORBIDDEN,
                            content={"error": "forbidden", "message": "Sin permisos."})

    if ova.status != "listo":
        return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                            content={"error": "ova_not_ready", "message": "El OVA no está listo."})

    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND,
                            content={"error": "file_not_found", "message": "Archivo SCORM no disponible."})

    active_version = _get_active_version(ova_id, db)
    version_num = active_version.version_number if active_version else 1
    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"

    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}_v{version_num}.zip",
        media_type="application/zip",
    )
