from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.rate_limit import limiter
from models import Ova, User
from ova.interface.http._shared import BatchIdsRequest, _delete_scorm_file, _is_admin

router = APIRouter()


@router.post("/lote/papelera", summary="Enviar varias OVA a la papelera")
@limiter.limit("10/minute")
def batch_move_to_trash(
    request: Request,
    payload: BatchIdsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    moved, skipped = [], []

    for ova_id in payload.ova_ids:
        ova = db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
        ).scalar_one_or_none()

        if not ova or (not admin and str(ova.user_id) != str(current_user.id)):
            skipped.append(ova_id)
            continue
        if ova.status == "generando":
            skipped.append(ova_id)
            continue

        ova.deleted_at = datetime.now(UTC)
        moved.append(ova_id)

    commit_or_500(db, op="batch_move_to_trash")
    return {
        "moved": moved,
        "skipped": skipped,
        "message": f"{len(moved)} OVA(s) movido(s) a la papelera. {len(skipped)} omitido(s).",
    }


@router.post("/lote/restaurar", summary="Restaurar varias OVA")
@limiter.limit("10/minute")
def batch_restore(
    request: Request,
    payload: BatchIdsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    restored, skipped = [], []

    for ova_id in payload.ova_ids:
        ova = db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_not(None))
        ).scalar_one_or_none()

        if not ova or (not admin and str(ova.user_id) != str(current_user.id)):
            skipped.append(ova_id)
            continue

        ova.deleted_at = None
        restored.append(ova_id)

    commit_or_500(db, op="batch_restore")
    return {
        "restored": restored,
        "skipped": skipped,
        "message": f"{len(restored)} OVA(s) restaurado(s). {len(skipped)} omitido(s).",
    }


@router.delete("/lote/permanente", summary="Eliminar varias OVA de forma permanente")
@limiter.limit("10/minute")
def batch_permanent_delete(
    request: Request,
    payload: BatchIdsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    deleted, skipped = [], []
    file_paths: list[str | None] = []

    for ova_id in payload.ova_ids:
        ova = db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_not(None))
        ).scalar_one_or_none()

        if not ova or (not admin and str(ova.user_id) != str(current_user.id)):
            skipped.append(ova_id)
            continue

        file_paths.append(ova.file_path)
        db.delete(ova)
        deleted.append(ova_id)

    # Files go only after the rows are gone for sure: if the commit fails the
    # zips stay on disk (orphan files are recoverable; rows without files not).
    commit_or_500(db, op="batch_permanent_delete")
    for path in file_paths:
        _delete_scorm_file(path)

    return {
        "deleted": deleted,
        "skipped": skipped,
        "message": f"{len(deleted)} OVA(s) eliminado(s) permanentemente. {len(skipped)} omitido(s).",
    }
