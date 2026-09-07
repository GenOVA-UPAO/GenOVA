"""Implementación en memoria + disco del puerto TempUploadRepository."""

from __future__ import annotations

import time
import uuid

from uploads.domain.model import TempUpload
from uploads.infrastructure import in_memory_store as store


def _to_entity(item: dict) -> TempUpload:
    return TempUpload(
        upload_id=item["upload_id"],
        user_id=item["user_id"],
        filename=item["filename"],
        content_type=item["content_type"],
        size_bytes=item["size_bytes"],
        storage_path=item["storage_path"],
        created_at=item["created_at"],
        expires_at=item["expires_at"],
        confirmed_at=item.get("confirmed_at"),
        rag_status=item.get("rag_status"),
    )


class InMemoryTempUploadRepository:
    def count_active(self, user_id: str) -> int:
        with store.lock():
            store.prune_expired_locked()
            return sum(1 for it in store.registry().values() if self._is_active(it, user_id))

    def list_active(self, user_id: str) -> list[TempUpload]:
        with store.lock():
            store.prune_expired_locked()
            items = [
                _to_entity(it) for it in store.registry().values() if self._is_active(it, user_id)
            ]
        items.sort(key=lambda u: u.created_at, reverse=True)
        return items

    def create(
        self, user_id: str, filename: str, content_type: str, content: bytes
    ) -> TempUpload:
        upload_id = str(uuid.uuid4())
        created_at = time.time()
        user_dir = store.temp_uploads_root() / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        storage_path = user_dir / f"{upload_id}_{filename}"
        with storage_path.open("wb") as fh:
            fh.write(content)

        payload = {
            "upload_id": upload_id,
            "user_id": user_id,
            "filename": filename,
            "content_type": content_type,
            "size_bytes": len(content),
            "storage_path": str(storage_path),
            "created_at": created_at,
            "expires_at": created_at + store.temp_ttl_seconds(),
            "confirmed_at": None,
        }
        with store.lock():
            store.prune_expired_locked()
            store.registry()[upload_id] = payload
        return _to_entity(payload)

    def get_storage_path(self, upload_id: str, user_id: str) -> str | None:
        with store.lock():
            store.prune_expired_locked()
            item = store.registry().get(upload_id)
            if not item or item["user_id"] != user_id:
                return None
            return item["storage_path"]

    def delete(self, upload_id: str, user_id: str) -> bool:
        with store.lock():
            store.prune_expired_locked()
            item = store.registry().get(upload_id)
            if not item or item["user_id"] != user_id:
                return False
            removed = store.registry().pop(upload_id)
        store.remove_file(removed["storage_path"])
        return True

    def set_rag_status(self, upload_id: str, rag_status: dict) -> None:
        with store.lock():
            item = store.registry().get(upload_id)
            if item is not None:
                item["rag_status"] = rag_status

    @staticmethod
    def _is_active(item: dict, user_id: str) -> bool:
        return item["user_id"] == user_id and item.get("confirmed_at") is None
