"""Puertos de la capa de aplicación de subidas."""

from __future__ import annotations

from typing import Protocol

from uploads.application.dto import RagStatus
from uploads.domain.model import TempUpload


class UploadLimits(Protocol):
    def max_files_per_request(self) -> int: ...
    def max_file_size_bytes(self) -> int: ...
    def max_file_size_mb(self) -> int: ...


class TempUploadRepository(Protocol):
    def count_active(self, user_id: str) -> int: ...

    def list_active(self, user_id: str) -> list[TempUpload]: ...

    def create(
        self, user_id: str, filename: str, content_type: str, content: bytes
    ) -> TempUpload: ...

    def get_storage_path(self, upload_id: str, user_id: str) -> str | None: ...

    def delete(self, upload_id: str, user_id: str) -> bool: ...

    def set_rag_status(self, upload_id: str, rag_status: dict) -> None: ...


class RagIngestionPort(Protocol):
    def is_enabled(self) -> bool: ...

    def ingest(
        self, *, user_id: str, upload_id: str, storage_path: str, filename: str
    ) -> RagStatus: ...
