from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, User
from ova.helpers import BatchIdsRequest, _delete_scorm_file, _is_admin

router = APIRouter()


@router.post("/lote/papelera")
def batch_move_to_trash(
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

    db.commit()
    return {
        "moved": moved,
        "skipped": skipped,
        "message": f"{len(moved)} OVA(s) movido(s) a la papelera. {len(skipped)} omitido(s).",
    }


@router.post("/lote/restaurar")
def batch_restore(
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

    db.commit()
    return {
        "restored": restored,
        "skipped": skipped,
        "message": f"{len(restored)} OVA(s) restaurado(s). {len(skipped)} omitido(s).",
    }


@router.delete("/lote/permanente")
def batch_permanent_delete(
    payload: BatchIdsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _is_admin(current_user, db)
    deleted, skipped = [], []

    for ova_id in payload.ova_ids:
        ova = db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_not(None))
        ).scalar_one_or_none()

        if not ova or (not admin and str(ova.user_id) != str(current_user.id)):
            skipped.append(ova_id)
            continue

        _delete_scorm_file(ova.file_path)
        db.delete(ova)
        deleted.append(ova_id)

    db.commit()
    return {
        "deleted": deleted,
        "skipped": skipped,
        "message": f"{len(deleted)} OVA(s) eliminado(s) permanentemente. {len(skipped)} omitido(s).",
    }
