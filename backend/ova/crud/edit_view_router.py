import logging
import os

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import OvaVersion, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _get_all_versions,
    _load_version_with_phases,
    _rebuild_scorm_for_version,
    _resolve_ova,
    _version_to_dict,
)
from rate_limit import limiter
from storage import StorageError, is_configured, signed_url
from users.admin.helpers import commit_or_500

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{ova_id}/editar")
def get_ova_editor(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err

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

    all_versions = _get_all_versions(ova_id, db)

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
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err

    versions = _get_all_versions(ova_id, db)

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
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "No se puede revertir mientras genera.",
            },
        )

    target = db.execute(
        select(OvaVersion).where(
            OvaVersion.id == version_id, OvaVersion.ova_id == ova_id
        )
    ).scalar_one_or_none()

    if not target:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "version_not_found",
                "message": "Versión no encontrada.",
            },
        )

    all_versions = (
        db.execute(select(OvaVersion).where(OvaVersion.ova_id == ova_id))
        .scalars()
        .all()
    )

    # Deactivate all first to avoid violating uq_one_active_version_per_ova
    # (partial unique index WHERE is_active=TRUE) before activating the target.
    for v in all_versions:
        v.is_active = False
    db.flush()

    target.is_active = True
    ova.current_version_id = target.id

    # Rebuild SCORM for the reverted version so export-scorm reflects the
    # correct content (ova.storage_key was still pointing at the previous zip).
    _rebuild_scorm_for_version(ova, target, str(current_user.id))

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
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err

    left = _load_version_with_phases(v1, ova_id, db)
    right = _load_version_with_phases(v2, ova_id, db)

    if not left or not right:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "version_not_found",
                "message": "Una o ambas versiones no encontradas.",
            },
        )

    return {"v1": left, "v2": right}


@router.get("/{ova_id}/export-scorm")
def export_scorm(
    ova_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return err

    if ova.status != "listo":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_not_ready",
                "message": "El OVA no está listo.",
            },
        )

    active_version = _get_active_version(ova_id, db)
    version_num = active_version.version_number if active_version else 1
    safe_title = (
        "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    )
    filename = f"{safe_title}_v{version_num}.zip"

    if ova.storage_key and is_configured():
        try:
            url = signed_url(str(ova.storage_key), download_as=filename)
            return JSONResponse({"download_url": url, "filename": filename})
        except StorageError:
            logger.exception(
                "Signed URL failed for ova=%s; falling back to disk", ova_id
            )

    if not ova.file_path or not os.path.exists(ova.file_path):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": "file_not_found",
                "message": "Archivo SCORM no disponible.",
            },
        )

    return FileResponse(
        path=ova.file_path,
        filename=filename,
        media_type="application/zip",
    )
