from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.http_errors import forbidden_response
from core.pagination import page_meta
from core.rate_limit import limiter
from models import Ova, User
from ova.interface.http._shared import _delete_scorm_file, _is_admin, _ova_to_dict
from ova.interface.http.trash_batch_router import router as trash_batch_router

router = APIRouter(tags=["OVA · Papelera"])


@router.get("/papelera/count", summary="Contar las OVA en la papelera")
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


@router.get("/papelera", summary="Listar las OVA en la papelera")
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

    ovas = (
        db.execute(
            base_query.order_by(Ova.deleted_at.desc()).offset((page - 1) * limit).limit(limit)
        )
        .scalars()
        .all()
    )

    return {
        "ovas": [_ova_to_dict(ova, include_owner=admin) for ova in ovas],
        **page_meta(total_items, page, limit),
    }


# Batch /lote/* routes registered before /{ova_id}/* so literal paths match first.
router.include_router(trash_batch_router)


@router.patch("/{ova_id}/restaurar", summary="Restaurar una OVA de la papelera")
@limiter.limit("30/minute")
def restore_ova(
    request: Request,
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
        return forbidden_response("No tienes permiso para restaurar este OVA.")

    ova.deleted_at = None
    commit_or_500(db, op="restore_ova")
    return {"message": "OVA restaurado correctamente.", "id": str(ova.id)}


@router.delete("/{ova_id}/permanente", summary="Eliminar una OVA de forma permanente")
@limiter.limit("20/minute")
def permanent_delete_ova(
    request: Request,
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
        return forbidden_response("No tienes permiso para eliminar este OVA.")

    # File goes only after the row is gone for sure: if the commit fails the
    # zip stays on disk (an orphan file is recoverable; a row without file not).
    file_path = ova.file_path
    db.delete(ova)
    commit_or_500(db, op="permanent_delete_ova")
    _delete_scorm_file(file_path)
    return {"message": "OVA eliminado permanentemente.", "id": ova_id}
