from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.rate_limit import limiter
from models import Ova, User
from ova.interface.http._shared import UpdateOvaMetadataRequest, _is_admin, forbidden_response

router = APIRouter(tags=["OVA · CRUD"])


@router.patch("/{ova_id}/metadata", summary="Actualizar los metadatos de la OVA")
@limiter.limit("30/minute")
def update_ova_metadata(
    request: Request,
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
        return forbidden_response("No tienes permiso para editar este OVA.")

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
    commit_or_500(db, op="update_ova_metadata")

    return {
        "id": str(ova.id),
        "title": ova.title,
        "description": ova.description,
        "message": "Metadatos actualizados correctamente.",
    }


@router.delete("/{ova_id}", summary="Enviar la OVA a la papelera")
@limiter.limit("20/minute")
def delete_ova(
    request: Request,
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
        return forbidden_response("No tienes permiso para eliminar este OVA.")

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "No se puede eliminar el OVA mientras se está generando.",
            },
        )

    ova.deleted_at = datetime.now(UTC)
    commit_or_500(db, op="delete_ova")

    return {"message": "OVA eliminado correctamente.", "id": str(ova.id)}
