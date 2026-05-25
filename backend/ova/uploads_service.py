import os
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

ALLOWED_MIME_TYPES = {
    # Documents
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # Audio — transcribed via Whisper (max 19.5 MB)
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
    # Images — analyzed via vision model
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

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


def _temp_uploads_root() -> Path:
    configured = os.getenv("UPLOAD_TEMP_DIR", "").strip()
    if configured:
        return Path(configured).resolve()

    return Path(__file__).resolve().parents[1] / "tmp" / "uploads"


def _remove_file(file_path: str) -> None:
    path_obj = Path(file_path)
    if not path_obj.exists():
        return
    path_obj.unlink(missing_ok=True)


def _serialize_upload(upload: dict) -> dict:
    return {
        "upload_id": upload["upload_id"],
        "filename": upload["filename"],
        "content_type": upload["content_type"],
        "size_bytes": upload["size_bytes"],
        "created_at": upload["created_at"],
        "expires_at": upload["expires_at"],
        "confirmed_at": upload.get("confirmed_at"),
    }


def _prune_expired_uploads_locked() -> None:
    now = time.time()
    expired_upload_ids = []

    for upload_id, item in _temp_uploads.items():
        if now >= float(item["expires_at"]):
            expired_upload_ids.append(upload_id)

    for upload_id in expired_upload_ids:
        item = _temp_uploads.pop(upload_id, None)
        if item:
            _remove_file(item["storage_path"])


def create_temp_upload(
    user_id: str, filename: str, content_type: str, content: bytes
) -> dict:
    upload_id = str(uuid.uuid4())
    created_at = time.time()
    expires_at = created_at + temp_ttl_seconds()
    safe_filename = Path(filename or "archivo").name
    user_dir = _temp_uploads_root() / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    storage_path = user_dir / f"{upload_id}_{safe_filename}"

    with storage_path.open("wb") as output_file:
        output_file.write(content)

    payload = {
        "upload_id": upload_id,
        "user_id": user_id,
        "filename": safe_filename,
        "content_type": content_type,
        "size_bytes": len(content),
        "storage_path": str(storage_path),
        "created_at": created_at,
        "expires_at": expires_at,
        "confirmed_at": None,
    }

    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        _temp_uploads[upload_id] = payload

    return _serialize_upload(payload)


def get_upload_storage_path(upload_id: str, user_id: str) -> Optional[str]:
    """Return the on-disk path of an upload owned by `user_id`, or None if the
    upload was pruned/expired/not-owned. Used by the RAG pipeline so the router
    layer doesn't have to know about internal payload shape."""
    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        item = _temp_uploads.get(upload_id)
        if not item or item["user_id"] != user_id:
            return None
        return item["storage_path"]


def list_user_uploads(user_id: str) -> list[dict]:
    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        user_uploads = [
            _serialize_upload(item)
            for item in _temp_uploads.values()
            if item["user_id"] == user_id and item.get("confirmed_at") is None
        ]

    user_uploads.sort(key=lambda item: item["created_at"], reverse=True)
    return user_uploads


def count_user_uploads(user_id: str) -> int:
    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        return sum(
            1
            for item in _temp_uploads.values()
            if item["user_id"] == user_id and item.get("confirmed_at") is None
        )


def delete_user_upload(upload_id: str, user_id: str) -> bool:
    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        item = _temp_uploads.get(upload_id)

        if not item or item["user_id"] != user_id:
            return False

        removed_item = _temp_uploads.pop(upload_id)

    _remove_file(removed_item["storage_path"])
    return True


def claim_user_uploads(
    user_id: str, upload_ids: list[str]
) -> tuple[list[dict], Optional[str]]:
    normalized_ids = []
    for raw_id in upload_ids:
        normalized = (raw_id or "").strip()
        if normalized:
            normalized_ids.append(normalized)

    if len(set(normalized_ids)) != len(normalized_ids):
        return [], "duplicate_upload_ids"

    if not normalized_ids:
        return [], None

    with _temp_uploads_lock:
        _prune_expired_uploads_locked()
        claimed_items = []

        for upload_id in normalized_ids:
            item = _temp_uploads.get(upload_id)
            if not item or item["user_id"] != user_id:
                return [], "upload_not_found"
            claimed_items.append(item)

        confirmed_at = time.time()
        for item in claimed_items:
            item["confirmed_at"] = confirmed_at

        serialized = [_serialize_upload(item) for item in claimed_items]

    return serialized, None
