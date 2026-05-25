"""In-memory registry of temp uploads + thread-safe pruning.

Kept in its own module so `uploads_service.py` can stay narrow and the lock
internals don't leak across the package boundary.
"""
import os
import threading
import time
from pathlib import Path

_temp_uploads: dict[str, dict] = {}
_temp_uploads_lock = threading.Lock()


def _parse_int_env(name: str, fallback: int) -> int:
    try:
        return int(os.getenv(name, str(fallback)))
    except (TypeError, ValueError):
        return fallback


def max_files_per_request() -> int:
    return max(1, _parse_int_env("UPLOAD_MAX_FILES", 5))


def max_file_size_mb() -> int:
    return max(1, _parse_int_env("UPLOAD_MAX_FILE_SIZE_MB", 20))


def max_file_size_bytes() -> int:
    return max_file_size_mb() * 1024 * 1024


def temp_ttl_seconds() -> int:
    return max(60, _parse_int_env("UPLOAD_TEMP_TTL_SECONDS", 3600))


def temp_uploads_root() -> Path:
    configured = os.getenv("UPLOAD_TEMP_DIR", "").strip()
    if configured:
        return Path(configured).resolve()
    return Path(__file__).resolve().parents[1] / "tmp" / "uploads"


def remove_file(file_path: str) -> None:
    path_obj = Path(file_path)
    if path_obj.exists():
        path_obj.unlink(missing_ok=True)


def serialize_upload(upload: dict) -> dict:
    return {
        "upload_id": upload["upload_id"],
        "filename": upload["filename"],
        "content_type": upload["content_type"],
        "size_bytes": upload["size_bytes"],
        "created_at": upload["created_at"],
        "expires_at": upload["expires_at"],
        "confirmed_at": upload.get("confirmed_at"),
    }


def prune_expired_locked() -> None:
    """Drop expired entries. Caller must hold `lock()`."""
    now = time.time()
    expired_ids = [uid for uid, item in _temp_uploads.items() if now >= float(item["expires_at"])]
    for uid in expired_ids:
        item = _temp_uploads.pop(uid, None)
        if item:
            remove_file(item["storage_path"])


def lock() -> threading.Lock:
    return _temp_uploads_lock


def registry() -> dict[str, dict]:
    return _temp_uploads
