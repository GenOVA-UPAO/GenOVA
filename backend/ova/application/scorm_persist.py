import os

import structlog

from ova.application.llm_helpers import _ova_output_dir
from storage import StorageError, is_configured, upload_zip

logger = structlog.get_logger(__name__)


def persist_scorm_zip(
    zip_bytes: bytes, user_id: str, ova_id: str, version: int
) -> tuple[str | None, str | None]:
    """Persist the SCORM zip. Prefer Supabase Storage; fall back to local disk.

    Returns `(storage_key, file_path)` — at least one is non-None.
    Local-disk fallback is kept so dev environments without Supabase keys still work.
    """
    object_key = f"{user_id}/{ova_id}_v{version}.zip"
    if is_configured():
        try:
            upload_zip(object_key, zip_bytes)
            return object_key, None
        except StorageError:
            logger.warning(
                "supabase upload failed, falling back to local disk", object_key=object_key
            )

    output_dir = _ova_output_dir()
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{ova_id}_v{version}.zip")
    with open(file_path, "wb") as f:
        f.write(zip_bytes)
    return None, file_path
