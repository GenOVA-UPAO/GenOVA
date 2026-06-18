import logging
import os

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from generation.regen_router import router as regen_router
from models import Ova, OvaPhase, OvaVersion, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
    _ova_output_dir,
)
from ova.crud.edit_view_router import router as edit_view_router
from ova.phases.phase_version_router import record_phase_micro_version
from rate_limit import limiter
from storage import StorageError, is_configured, upload_zip
from users.admin.helpers import commit_or_500

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Reorder ──────────────────────────────────────────────────────────────────

class ReorderItem(BaseModel):
    phase_id: str
    new_order: int


class ReorderRequest(BaseModel):
    reorders: list[ReorderItem]


@router.patch("/{ova_id}/fases/reorder")
@limiter.limit("30/minute")
def reorder_phases(
    request: Request,
    ova_id: str,
    payload: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.reorders:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "empty", "message": "Lista de reordenamiento vacía."},
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
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_generating", "message": "No se puede editar mientras genera."},
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    phase_ids = [item.phase_id for item in payload.reorders]
    phases = (
        db.execute(
            select(OvaPhase).where(
                OvaPhase.id.in_(phase_ids),
                OvaPhase.version_id == active_version.id,
            )
        )
        .scalars()
        .all()
    )

    if len(phases) != len(payload.reorders):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "phases_not_found", "message": "Una o más fases no existen."},
        )

    # R6: validate all phases belong to the same phase_type (no cross-phase moves)
    phase_types = {p.phase_type for p in phases}
    if len(phase_types) > 1:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "cross_phase_move",
                "message": "No se puede mover un recurso entre fases distintas.",
            },
        )

    # R5: update phase_order in-place — no new version created
    phase_map = {str(p.id): p for p in phases}
    for item in payload.reorders:
        phase_map[item.phase_id].phase_order = item.new_order

    commit_or_500(db, op="reorder_phases")

    return {"message": "Orden actualizado.", "reordered": len(payload.reorders)}


# ── Delete phase (creates new version without the phase) ─────────────────────

@router.delete("/{ova_id}/fases/{fase_id}")
@limiter.limit("20/minute")
def delete_phase(
    request: Request,
    ova_id: str,
    fase_id: str,
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

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_generating", "message": "No se puede editar mientras genera."},
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

    remaining = [p for p in current_phases if str(p.id) != fase_id]
    if not remaining:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": "last_phase", "message": "No se puede eliminar la única fase restante."},
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
    for p in remaining:
        new_phase = OvaPhase(
            version_id=new_version.id,
            phase_type=p.phase_type,
            phase_order=p.phase_order,
            content=p.content,
            regenerated=p.regenerated,
        )
        db.add(new_phase)
        new_phases_data.append(
            {"type": p.phase_type, "order": p.phase_order, "content": p.content}
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
    commit_or_500(db, op="delete_phase")

    return {
        "new_version_number": new_version_number,
        "version_id": str(new_version.id),
        "message": f"Fase eliminada. Nueva versión v{new_version_number} creada.",
    }


# ── Save phase content (creates new version) ─────────────────────────────────

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
    edited_new_phase = None
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
        if str(p.id) == fase_id:
            edited_new_phase = new_phase
        new_phases_data.append(
            {"type": p.phase_type, "order": p.phase_order, "content": new_content}
        )

    db.flush()

    # HU-029: record micro-version for the edited phase
    if edited_new_phase is not None:
        record_phase_micro_version(db, edited_new_phase.id, ova_id, payload.content)

    from scorm.service import build_scorm_zip_bytes

    zip_bytes = build_scorm_zip_bytes(
        course_title=ova.title,
        module_title="OVA Generado por GenOVA",
        phases=new_phases_data,
    )

    object_key = f"{current_user.id}/{ova_id}_v{new_version_number}.zip"
    stored_key: str | None = None
    stored_path: str | None = None
    if is_configured():
        try:
            upload_zip(object_key, zip_bytes)
            stored_key = object_key
        except StorageError:
            logger.warning("Supabase upload failed for %s; falling back to disk", object_key)

    if not stored_key:
        output_dir = _ova_output_dir()
        os.makedirs(output_dir, exist_ok=True)
        stored_path = os.path.join(output_dir, f"{ova_id}_v{new_version_number}.zip")
        with open(stored_path, "wb") as f:
            f.write(zip_bytes)

    ova.storage_key = stored_key
    ova.file_path = stored_path
    ova.current_version_id = new_version.id
    db.commit()

    return {
        "new_version_number": new_version_number,
        "version_id": str(new_version.id),
        "message": f"Fase guardada. Nueva versión v{new_version_number} creada.",
    }


router.include_router(regen_router)
router.include_router(edit_view_router)
