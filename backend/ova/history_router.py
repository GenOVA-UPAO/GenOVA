import math
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
import time

from models import Ova, OvaPhase, OvaVersion, Role, User, UserRole

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


class BatchIdsRequest(BaseModel):
    ova_ids: list[str] = Field(min_length=1)


def _delete_scorm_file(file_path: str | None) -> None:
    if file_path:
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass


# ── Trash endpoints (must be before /{ova_id} routes) ─────────────────────

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
            base_query.order_by(Ova.deleted_at.desc())
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

        ova.deleted_at = datetime.now(timezone.utc)
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


# ── Active OVA list ────────────────────────────────────────────────────────

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


def _unique_copy_title(base_title: str, user_id, db: Session) -> str:
    candidate = f"{base_title} (copia)"
    exists = db.execute(
        select(Ova).where(Ova.user_id == user_id, Ova.title == candidate, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()
    if not exists:
        return candidate
    for n in range(2, 12):
        candidate = f"{base_title} (copia {n})"
        exists = db.execute(
            select(Ova).where(Ova.user_id == user_id, Ova.title == candidate, Ova.deleted_at.is_(None))
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
            content={"error": "ova_generating", "message": "No se puede duplicar mientras se está generando."},
        )

    active_version = db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
    ).scalar_one_or_none()

    source_prompt = original.description or original.title or ""
    source_phases = []
    if active_version:
        source_prompt = active_version.prompt
        source_phases = list(db.execute(
            select(OvaPhase)
            .where(OvaPhase.version_id == active_version.id)
            .order_by(OvaPhase.phase_order)
        ).scalars().all())

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
        db.add(OvaPhase(
            version_id=new_version.id,
            phase_type=phase.phase_type,
            phase_order=phase.phase_order,
            content=phase.content,
            regenerated=False,
        ))

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
            content={"error": "not_found", "message": "OVA no encontrado en la papelera."},
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "No tienes permiso para restaurar este OVA."},
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
            content={"error": "not_found", "message": "OVA no encontrado en la papelera."},
        )

    admin = _is_admin(current_user, db)
    if not admin and str(ova.user_id) != str(current_user.id):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "No tienes permiso para eliminar este OVA."},
        )

    _delete_scorm_file(ova.file_path)
    db.delete(ova)
    db.commit()
    return {"message": "OVA eliminado permanentemente.", "id": ova_id}
