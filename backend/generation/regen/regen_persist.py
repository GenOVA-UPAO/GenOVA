"""Persistence helpers for the regen service: SCORM build/upload + error mark.

Kept apart from regen_service so the orchestration thread reads top-to-bottom.
"""

import logging
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova
from ova.crud.edit_helpers import _ova_output_dir

logger = logging.getLogger(__name__)


def _build_and_persist(ova, ova_id, new_version, version_num, phases_data, db):
    """Build SCORM zip and persist to storage or disk."""
    from scorm.service import build_scorm_zip_bytes
    from storage import StorageError, is_configured, upload_zip

    zip_bytes = build_scorm_zip_bytes(
        course_title=ova.title,
        module_title="OVA Generado por GenOVA",
        phases=phases_data,
    )

    storage_key = None
    file_path = None

    if is_configured():
        try:
            storage_key = f"{ova.user_id}/{ova_id}_v{version_num}.zip"
            upload_zip(storage_key, zip_bytes)
        except StorageError:
            logger.warning("Supabase upload failed for regen %s; using disk", ova_id)
            storage_key = None

    if not storage_key:
        output_dir = _ova_output_dir()
        os.makedirs(output_dir, exist_ok=True)
        file_path = os.path.join(output_dir, f"{ova_id}_v{version_num}.zip")
        with open(file_path, "wb") as f:
            f.write(zip_bytes)

    ova.status = "listo"
    ova.storage_key = storage_key
    ova.file_path = file_path
    ova.current_version_id = new_version.id
    db.commit()


def _mark_ova_error(db: Session, ova_id: str) -> None:
    """Set OVA status to error on regen failure."""
    try:
        ova = db.execute(select(Ova).where(Ova.id == ova_id)).scalar_one_or_none()
        if ova:
            ova.status = "error"
            db.commit()
    except Exception:
        # Best-effort status update; the regen failure is already surfaced to
        # the caller, so failing to mark it here is non-fatal and swallowed.
        pass
