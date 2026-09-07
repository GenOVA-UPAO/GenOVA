import os

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from auth.dependencies import get_current_user
from core.database import get_db
from core.pagination import page_meta
from generation.jobs.jobs_service import sweep_stale_jobs_for_ovas
from models import Ova, OvaVersion, User
from ova.helpers import VALID_STATUSES, _is_admin, _ova_to_dict, forbidden_response
from storage import StorageError, is_configured, signed_url

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("", tags=["OVA · CRUD"], summary="Listar las OVA del usuario")
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

    # El número de versión activa (HU-030) se resuelve con una subconsulta escalar
    # en vez de joinedload(Ova.versions): la colección duplicaba filas e impedía
    # fusionar el COUNT con la consulta de página. Sin duplicación, `count(*) OVER ()`
    # devuelve el total del conjunto filtrado (Postgres evalúa la ventana antes del
    # LIMIT), así que listado y total viajan en un único round-trip (RN-001).
    active_version_sq = (
        select(OvaVersion.version_number)
        .where(OvaVersion.ova_id == Ova.id, OvaVersion.is_active.is_(True))
        .correlate(Ova)
        .limit(1)
        .scalar_subquery()
    )
    page_query = base_query.add_columns(
        active_version_sq.label("active_version_number"),
        func.count().over().label("total_items"),
    )
    if admin:
        # many-to-one: no duplica filas, no afecta a la ventana.
        page_query = page_query.options(joinedload(Ova.owner))

    rows = (
        db.execute(
            page_query.order_by(Ova.created_at.desc()).offset((page - 1) * limit).limit(limit)
        )
        .unique()
        .all()
    )

    ovas = [row[0] for row in rows]
    if rows:
        total_items = rows[0].total_items
    elif page > 1:
        # Página vacía más allá del final: la ventana no devuelve filas, así que el
        # total se consulta aparte (caso raro, no está en la ruta caliente).
        total_items = db.execute(
            select(func.count()).select_from(base_query.subquery())
        ).scalar_one()
    else:
        total_items = 0

    # GN-03: los jobs zombis ("generando" con worker muerto o cola abandonada)
    # solo se barrían al consultar el job exacto; al listar la página los
    # finalizamos aquí para que el badge muestre el estado real.
    sweep_stale_jobs_for_ovas(db, [ova.id for ova in ovas if ova.status == "generando"])

    return {
        "ovas": [
            _ova_to_dict(
                row[0], include_owner=admin, active_version_number=row.active_version_number
            )
            for row in rows
        ],
        **page_meta(total_items, page, limit),
    }


@router.get("/{ova_id}/download", tags=["SCORM y descargas"], summary="Descargar la OVA")
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
        return forbidden_response("No tienes permiso para descargar este OVA.")

    if ova.status != "listo":
        return JSONResponse(
            status_code=409,
            content={
                "error": "ova_not_ready",
                "message": "El OVA aún no está listo para descargar.",
            },
        )

    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"

    # Prefer Supabase Storage signed URL (production path).
    if ova.storage_key and is_configured():
        try:
            filename = f"{safe_title}.zip"
            url = signed_url(str(ova.storage_key), download_as=filename)
            return JSONResponse({"download_url": url, "filename": filename})
        except StorageError:
            logger.exception("signed url failed, falling back to disk", ova_id=ova_id)

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


from ova.lifecycle.duplicate_router import router as duplicate_router  # noqa: E402
from ova.lifecycle.manage_router import router as manage_router  # noqa: E402
from ova.lifecycle.trash_router import router as trash_router  # noqa: E402

router.include_router(trash_router)
router.include_router(duplicate_router)
router.include_router(manage_router)
