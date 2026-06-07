import os

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, OvaVersion, User
from ova.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
    _phase_to_dict,
    _version_to_dict,
)
from rate_limit import limiter
from users.admin_helpers import commit_or_500

router = APIRouter()


@router.get("/{ova_id}/editar")
def get_ova_editor(
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

    if not _is_ova_owner(ova, current_user):
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
                "message": "No disponible mientras se genera el OVA.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    all_versions = (
        db.execute(
            select(OvaVersion)
            .where(OvaVersion.ova_id == ova_id)
            .order_by(OvaVersion.version_number.desc())
        )
        .scalars()
        .all()
    )

    return {
        "ova_id": str(ova.id),
        "title": ova.title,
        "status": ova.status,
        "current_version": _version_to_dict(active_version, include_phases=True),
        "version_history": [_version_to_dict(v) for v in all_versions],
    }


@router.get("/{ova_id}/versiones")
def list_ova_versions(
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

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    versions = (
        db.execute(
            select(OvaVersion)
            .where(OvaVersion.ova_id == ova_id)
            .order_by(OvaVersion.version_number.desc())
        )
        .scalars()
        .all()
    )

    return {
        "ova_id": ova_id,
        "versions": [_version_to_dict(v) for v in versions],
    }


@router.post("/{ova_id}/versiones/{version_id}/revert")
@limiter.limit("10/minute")
def revert_to_version(
    request: Request,
    ova_id: str,
    version_id: str,
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

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_generating", "message": "No se puede revertir mientras genera."},
        )

    target = db.execute(
        select(OvaVersion).where(OvaVersion.id == version_id, OvaVersion.ova_id == ova_id)
    ).scalar_one_or_none()

    if not target:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "version_not_found", "message": "Versión no encontrada."},
        )

    all_versions = db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id)
    ).scalars().all()

    for v in all_versions:
        v.is_active = str(v.id) == version_id

    ova.current_version_id = target.id
    commit_or_500(db, op="revert_version")

    return {
        "version_number": target.version_number,
        "version_id": str(target.id),
        "message": f"Revertido a v{target.version_number}.",
    }


@router.get("/{ova_id}/versiones/diff")
def get_version_diff(
    ova_id: str,
    v1: str,
    v2: str,
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

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    def _load_version(vid: str):
        ver = db.execute(
            select(OvaVersion).where(OvaVersion.id == vid, OvaVersion.ova_id == ova_id)
        ).scalar_one_or_none()
        if not ver:
            return None
        phases = db.execute(
            select(OvaPhase)
            .where(OvaPhase.version_id == vid)
            .order_by(OvaPhase.phase_order)
        ).scalars().all()
        return {"version": _version_to_dict(ver), "phases": [_phase_to_dict(p) for p in phases]}

    left = _load_version(v1)
    right = _load_version(v2)

    if not left or not right:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "version_not_found", "message": "Una o ambas versiones no encontradas."},
        )

    return {"v1": left, "v2": right}


@router.get("/{ova_id}/export-scorm")
def export_scorm(
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

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    if ova.status != "listo":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_not_ready", "message": "El OVA no está listo."},
        )

    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "file_not_found",
                "message": "Archivo SCORM no disponible.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    version_num = active_version.version_number if active_version else 1
    safe_title = (
        "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    )

    return FileResponse(
        path=ova.file_path,
        filename=f"{safe_title}_v{version_num}.zip",
        media_type="application/zip",
    )
