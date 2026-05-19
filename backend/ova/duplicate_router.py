import time

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, OvaVersion, User
from ova.helpers import VALID_STATUSES, _is_admin, _ova_to_dict

router = APIRouter()


def _unique_copy_title(base_title: str, user_id, db: Session) -> str:
    candidate = f"{base_title} (copia)"
    exists = db.execute(
        select(Ova).where(
            Ova.user_id == user_id, Ova.title == candidate, Ova.deleted_at.is_(None)
        )
    ).scalar_one_or_none()
    if not exists:
        return candidate
    for n in range(2, 12):
        candidate = f"{base_title} (copia {n})"
        exists = db.execute(
            select(Ova).where(
                Ova.user_id == user_id, Ova.title == candidate, Ova.deleted_at.is_(None)
            )
        ).scalar_one_or_none()
        if not exists:
            return candidate
    return f"{base_title} (copia {int(time.time())})"


@router.post("/{ova_id}/duplicar", status_code=201)
def duplicate_ova(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    original = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not original:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if original.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "No se puede duplicar mientras se está generando.",
            },
        )

    active_version = db.execute(
        select(OvaVersion).where(
            OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True)
        )
    ).scalar_one_or_none()

    source_prompt = original.description or original.title or ""
    source_phases = []
    if active_version:
        source_prompt = active_version.prompt
        source_phases = list(
            db.execute(
                select(OvaPhase)
                .where(OvaPhase.version_id == active_version.id)
                .order_by(OvaPhase.phase_order)
            )
            .scalars()
            .all()
        )

    new_title = _unique_copy_title(original.title, current_user.id, db)

    new_ova = Ova(
        user_id=current_user.id,
        title=new_title,
        description=original.description,
        status="borrador",
    )
    db.add(new_ova)
    db.flush()

    new_version = OvaVersion(
        ova_id=new_ova.id,
        version_number=1,
        prompt=source_prompt,
        is_active=True,
    )
    db.add(new_version)
    db.flush()

    for phase in source_phases:
        db.add(
            OvaPhase(
                version_id=new_version.id,
                phase_type=phase.phase_type,
                phase_order=phase.phase_order,
                content=phase.content,
                regenerated=False,
            )
        )

    new_ova.current_version_id = new_version.id
    db.commit()

    new_id = str(new_ova.id)
    return JSONResponse(
        status_code=201,
        content={
            "id": new_id,
            "title": new_title,
            "status": "borrador",
            "message": "OVA duplicado correctamente.",
            "edit_url": f"/mis-ovas/{new_id}/editar",
        },
    )
