import math

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from models import Ova, User
from ova.helpers import _delete_scorm_file, _is_admin, _ova_to_dict
from ova.lifecycle.trash_batch_router import router as trash_batch_router

router = APIRouter()


@router.get("/papelera/count")
def count_trashed_ovas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    query = select(func.count()).select_from(Ova).where(Ova.deleted_at.is_not(None))
    if not admin:
        query = query.where(Ova.user_id == current_user.id)
    count = db.execute(query).scalar_one()
    return {"count": count}


@router.get("/papelera")
def list_trashed_ovas(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    base_query = select(Ova).where(Ova.deleted_at.is_not(None))
    if not admin:
        base_query = base_query.where(Ova.user_id == current_user.id)

    count_query = select(func.count()).select_from(base_query.subquery())
    total_items = db.execute(count_query).scalar_one()
    total_pages = max(1, math.ceil(total_items / limit))

    ovas = (
        db.execute(
            base_query.order_by(Ova.deleted_at.desc()).offset((page - 1) * limit).limit(limit)
        )
        .scalars()
        .all()
    )

    return {
        "ovas": [_ova_to_dict(ova, include_owner=admin) for ova in ovas],
        "total_items": total_items,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
    }


# Batch /lote/* routes registered before /{ova_id}/* so literal paths match first.
router.include_router(trash_batch_router)


@router.patch("/{ova_id}/restaurar")
def restore_ova(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_not(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "not_found",
                "message": "OVA no encontrado en la papelera.",
            },
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "forbidden",
                "message": "No tienes permiso para restaurar este OVA.",
            },
        )

    ova.deleted_at = None
    db.commit()
    return {"message": "OVA restaurado correctamente.", "id": str(ova.id)}


@router.delete("/{ova_id}/permanente")
def permanent_delete_ova(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_not(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "not_found",
                "message": "OVA no encontrado en la papelera.",
            },
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "forbidden",
                "message": "No tienes permiso para eliminar este OVA.",
            },
        )

    _delete_scorm_file(ova.file_path)
    db.delete(ova)
    db.commit()
    return {"message": "OVA eliminado permanentemente.", "id": ova_id}
