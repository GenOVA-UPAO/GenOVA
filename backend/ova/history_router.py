import logging
import math
import os

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, User
from ova.helpers import VALID_STATUSES, _is_admin, _ova_to_dict
from storage import StorageError, is_configured, signed_url

router = APIRouter()
logger = logging.getLogger(__name__)


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

    # Eager-load owner for admin view — eliminates N+1 lazy loads per row.
    # Applied after count_query is built so the subquery stays clean.
    if admin:
        base_query = base_query.options(joinedload(Ova.owner))

    ovas = (
        db.execute(
            base_query.order_by(Ova.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        .unique()
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
            status_code=404,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=403,
            content={
                "error": "forbidden",
                "message": "No tienes permiso para descargar este OVA.",
            },
        )

    if ova.status != "listo":
        return JSONResponse(
            status_code=409,
            content={
                "error": "ova_not_ready",
                "message": "El OVA aún no está listo para descargar.",
            },
        )

    safe_title = (
        "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    )

    # Prefer Supabase Storage signed URL (production path).
    if ova.storage_key and is_configured():
        try:
            url = signed_url(str(ova.storage_key))
            return RedirectResponse(url=url, status_code=302)
        except StorageError:
            logger.exception("Signed URL failed for ova=%s; falling back to disk", ova_id)

    # Legacy / dev fallback: serve from local disk.
    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(
            status_code=404,
            content={
                "error": "file_not_found",
                "message": "El archivo del OVA no está disponible.",
            },
        )

    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}.zip",
        media_type="application/zip",
    )


from ova.duplicate_router import router as duplicate_router
from ova.manage_router import router as manage_router
from ova.trash_router import router as trash_router

router.include_router(trash_router)
router.include_router(duplicate_router)
router.include_router(manage_router)
