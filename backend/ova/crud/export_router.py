"""SCORM export endpoint for an OVA's active version.

Split out of edit_view_router (version/editor reads) and included back into it
so the path stays under the same mount.
"""

import logging
import os

from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from models import User
from ova.crud.edit_helpers import _get_active_version, _resolve_ova
from storage import StorageError, is_configured, signed_url

logger = logging.getLogger(__name__)

router = APIRouter()


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
    safe_title = "".join(c for c in ova.title if c.isalnum() or c in " _-").strip() or "ova"
    filename = f"{safe_title}_v{version_num}.zip"

    if ova.storage_key and is_configured():
        try:
            url = signed_url(str(ova.storage_key), download_as=filename)
            return JSONResponse({"download_url": url, "filename": filename})
        except StorageError:
            logger.exception("Signed URL failed for ova=%s; falling back to disk", ova_id)

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
