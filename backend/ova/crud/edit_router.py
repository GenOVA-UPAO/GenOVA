import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from generation.regen.regen_router import router as regen_router
from models import OvaPhase, User
from ova.crud.edit_helpers import _rebuild_scorm_for_version
from ova.crud.edit_phase_ops import (
    ReorderRequest,
    SavePhaseRequest,
    _create_new_version,
    _get_phase,
    _list_phases,
    _resolve_ova_and_version,
)
from ova.crud.edit_view_router import router as edit_view_router
from ova.phases.phase_version_router import record_phase_micro_version
from users.admin.helpers import commit_or_500

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Reorder phases ────────────────────────────────────────────────────────────


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
    ova, active_version, err = _resolve_ova_and_version(ova_id, current_user, db)
    if err:
        return err

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
    # R6: no cross-phase-type moves
    if len({p.phase_type for p in phases}) > 1:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "cross_phase_move",
                "message": "No se puede mover un recurso entre fases distintas.",
            },
        )
    # R5: update phase_order in-place (no new version)
    phase_map = {str(p.id): p for p in phases}
    for item in payload.reorders:
        phase_map[item.phase_id].phase_order = item.new_order
    commit_or_500(db, op="reorder_phases")
    return {"message": "Orden actualizado.", "reordered": len(payload.reorders)}


# ── Delete phase ──────────────────────────────────────────────────────────────


@router.delete("/{ova_id}/fases/{fase_id}")
@limiter.limit("20/minute")
def delete_phase(
    request: Request,
    ova_id: str,
    fase_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, active_version, err = _resolve_ova_and_version(ova_id, current_user, db)
    if err:
        return err
    if not _get_phase(fase_id, str(active_version.id), db):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "phase_not_found", "message": "Fase no encontrada."},
        )
    current_phases = _list_phases(str(active_version.id), db)
    remaining = [p for p in current_phases if str(p.id) != fase_id]
    if not remaining:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "last_phase",
                "message": "No se puede eliminar la única fase restante.",
            },
        )
    new_phases_data = [
        {"type": p.phase_type, "order": p.phase_order, "content": p.content} for p in remaining
    ]
    new_version = _create_new_version(ova, active_version, new_phases_data, db)
    db.refresh(new_version, ["phases"])
    _rebuild_scorm_for_version(ova, new_version, str(current_user.id))
    ova.current_version_id = new_version.id
    commit_or_500(db, op="delete_phase")
    return {
        "new_version_number": new_version.version_number,
        "version_id": str(new_version.id),
        "message": f"Fase eliminada. Nueva versión v{new_version.version_number} creada.",
    }


# ── Save phase content ────────────────────────────────────────────────────────


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
            content={"error": "content_required", "message": "El contenido no puede estar vacío."},
        )
    ova, active_version, err = _resolve_ova_and_version(ova_id, current_user, db)
    if err:
        return err
    phase = _get_phase(fase_id, str(active_version.id), db)
    if not phase:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "phase_not_found", "message": "Fase no encontrada."},
        )
    current_phases = _list_phases(str(active_version.id), db)
    new_phases_data = [
        {
            "type": p.phase_type,
            "order": p.phase_order,
            "content": payload.content if str(p.id) == fase_id else p.content,
        }
        for p in current_phases
    ]
    new_version = _create_new_version(ova, active_version, new_phases_data, db)
    # HU-029: record micro-version for the edited phase
    edited_phase = db.execute(
        select(OvaPhase).where(
            OvaPhase.version_id == new_version.id,
            OvaPhase.phase_type == phase.phase_type,
        )
    ).scalar_one_or_none()
    if edited_phase is not None:
        record_phase_micro_version(db, edited_phase.id, ova_id, payload.content)
    db.refresh(new_version, ["phases"])
    _rebuild_scorm_for_version(ova, new_version, str(current_user.id))
    ova.current_version_id = new_version.id
    commit_or_500(db, op="save_phase")
    return {
        "new_version_number": new_version.version_number,
        "version_id": str(new_version.id),
        "message": f"Fase guardada. Nueva versión v{new_version.version_number} creada.",
    }


router.include_router(regen_router)
router.include_router(edit_view_router)
