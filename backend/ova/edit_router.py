import os

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
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
)
from ova.edit_view_router import router as edit_view_router
from ova.regen_router import router as regen_router

router = APIRouter()


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


router.include_router(regen_router)
router.include_router(edit_view_router)
