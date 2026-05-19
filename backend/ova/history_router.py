import math
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, User
from ova.helpers import (
    VALID_STATUSES,
    _is_admin,
    _ova_to_dict,
    BatchIdsRequest,
    UpdateOvaMetadataRequest,
)

router = APIRouter()


@router.get("")
def list_ovas(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)

    base_query = select(Ova).where(Ova.deleted_at.is_(None))

    if not admin:
        base_query = base_query.where(Ova.user_id == current_user.id)

    if search.strip():
        base_query = base_query.where(Ova.title.ilike(f"%{search.strip()}%"))

    if status.strip() and status.strip() in VALID_STATUSES:
        base_query = base_query.where(Ova.status == status.strip())

    count_query = select(func.count()).select_from(base_query.subquery())
    total_items = db.execute(count_query).scalar_one()
    total_pages = max(1, math.ceil(total_items / limit))

    ovas = (
        db.execute(
            base_query.order_by(Ova.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
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


@router.patch("/{ova_id}/metadata")
def update_ova_metadata(
    ova_id: str,
    payload: UpdateOvaMetadataRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clean_title = payload.title.strip()
    clean_description = (payload.description or "").strip() or None

    if not clean_title:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "title_required", "message": "El título es obligatorio."},
        )

    if len(clean_title) > 100:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "title_too_long",
                "message": "El título no puede superar 100 caracteres.",
            },
        )

    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "not_found",
                "message": "OVA no encontrado o ya eliminado.",
            },
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
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
                "message": "No se puede editar el OVA mientras se está generando.",
            },
        )

    ova.title = clean_title
    ova.description = clean_description
    db.commit()

    return {
        "id": str(ova.id),
        "title": ova.title,
        "description": ova.description,
        "message": "Metadatos actualizados correctamente.",
    }


@router.delete("/{ova_id}")
def delete_ova(
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
            content={
                "error": "not_found",
                "message": "OVA no encontrado o ya eliminado.",
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

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "No se puede eliminar el OVA mientras se está generando.",
            },
        )

    ova.deleted_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "OVA eliminado correctamente.", "id": str(ova.id)}


@router.get("/{ova_id}/download")
def download_ova(
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

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "forbidden",
                "message": "No tienes permiso para descargar este OVA.",
            },
        )

    if ova.status != "listo":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_not_ready",
                "message": "El OVA aún no está listo para descargar.",
            },
        )

    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "file_not_found",
                "message": "El archivo del OVA no está disponible.",
            },
        )

    safe_title = (
        "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    )
    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}.zip",
        media_type="application/zip",
    )


from ova.trash_router import router as trash_router
from ova.duplicate_router import router as duplicate_router

router.include_router(trash_router)
router.include_router(duplicate_router)
