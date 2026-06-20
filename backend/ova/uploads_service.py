"""Temporary upload CRUD on top of the in-memory `uploads_state` registry."""

import time
import uuid
from pathlib import Path

from ova.uploads_state import (
    lock,
    max_file_size_bytes,
    max_file_size_mb,
    max_files_per_request,
    prune_expired_locked,
    registry,
    remove_file,
    serialize_upload,
    temp_ttl_seconds,
    temp_uploads_root,
)

ALLOWED_MIME_TYPES = {
    # Documents
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    # Audio — transcribed via Whisper (Groq free-tier cap ~25 MB).
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/aac",
    "audio/ogg",
    "audio/webm",
    # Images — analyzed via vision model.
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

__all__ = [
    "ALLOWED_MIME_TYPES",
    "claim_user_uploads",
    "count_user_uploads",
    "create_temp_upload",
    "delete_user_upload",
    "get_upload_storage_path",
    "list_user_uploads",
    "max_file_size_bytes",
    "max_file_size_mb",
    "max_files_per_request",
]


def create_temp_upload(user_id: str, filename: str, content_type: str, content: bytes) -> dict:
    upload_id = str(uuid.uuid4())
    created_at = time.time()
    expires_at = created_at + temp_ttl_seconds()
    safe_filename = Path(filename or "archivo").name
    user_dir = temp_uploads_root() / user_id
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
    with lock():
        prune_expired_locked()
        registry()[upload_id] = payload
    return serialize_upload(payload)


def get_upload_storage_path(upload_id: str, user_id: str) -> str | None:
    """Path of an upload owned by `user_id`, or None if pruned / not owned."""
    with lock():
        prune_expired_locked()
        item = registry().get(upload_id)
        if not item or item["user_id"] != user_id:
            return None
        return item["storage_path"]


def list_user_uploads(user_id: str) -> list[dict]:
    with lock():
        prune_expired_locked()
        items = [
            serialize_upload(item)
            for item in registry().values()
            if item["user_id"] == user_id and item.get("confirmed_at") is None
        ]
    items.sort(key=lambda item: item["created_at"], reverse=True)
    return items


def count_user_uploads(user_id: str) -> int:
    with lock():
        prune_expired_locked()
        return sum(
            1
            for item in registry().values()
            if item["user_id"] == user_id and item.get("confirmed_at") is None
        )


def delete_user_upload(upload_id: str, user_id: str) -> bool:
    with lock():
        prune_expired_locked()
        item = registry().get(upload_id)
        if not item or item["user_id"] != user_id:
            return False
        removed_item = registry().pop(upload_id)
    remove_file(removed_item["storage_path"])
    return True


def claim_user_uploads(user_id: str, upload_ids: list[str]) -> tuple[list[dict], str | None]:
    normalized = [u.strip() for u in upload_ids if (u or "").strip()]
    if len(set(normalized)) != len(normalized):
        return [], "duplicate_upload_ids"
    if not normalized:
        return [], None

    with lock():
        prune_expired_locked()
        claimed = []
        for upload_id in normalized:
            item = registry().get(upload_id)
            if not item or item["user_id"] != user_id:
                return [], "upload_not_found"
            claimed.append(item)
        confirmed_at = time.time()
        for item in claimed:
            item["confirmed_at"] = confirmed_at
        return [serialize_upload(item) for item in claimed], None
