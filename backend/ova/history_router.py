import math
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, Role, User, UserRole

router = APIRouter()

VALID_STATUSES = {"borrador", "generando", "listo", "error"}


def _is_admin(user: User, db: Session) -> bool:
    result = db.execute(
        select(UserRole)
        .join(Role)
        .where(UserRole.user_id == user.id, Role.name == "administrador")
    ).scalar_one_or_none()
    return result is not None


def _ova_to_dict(ova: Ova, include_owner: bool = False) -> dict:
    data = {
        "id": str(ova.id),
        "title": ova.title,
        "description": ova.description,
        "status": ova.status,
        "file_path": ova.file_path,
        "created_at": ova.created_at.isoformat() if ova.created_at else None,
        "updated_at": ova.updated_at.isoformat() if ova.updated_at else None,
    }
    if include_owner and ova.owner:
        data["owner"] = {
            "id": str(ova.owner.id),
            "full_name": ova.owner.full_name or ova.owner.email,
        }
    return data


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
            content={"error": "not_found", "message": "OVA no encontrado o ya eliminado."},
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "No tienes permiso para eliminar este OVA."},
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
            content={"error": "forbidden", "message": "No tienes permiso para descargar este OVA."},
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
            content={"error": "file_not_found", "message": "El archivo del OVA no está disponible."},
        )

    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}.zip",
        media_type="application/zip",
    )