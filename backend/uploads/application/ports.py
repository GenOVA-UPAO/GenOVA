"""Puertos de la capa de aplicación de subidas."""

from __future__ import annotations

from typing import Protocol

from uploads.application.dto import RagStatus
from uploads.domain.model import TempUpload


class UploadLimits(Protocol):
    def max_files_per_request(self) -> int:
        raise NotImplementedError
    def max_file_size_bytes(self) -> int:
        raise NotImplementedError
    def max_file_size_mb(self) -> int:
        raise NotImplementedError


class TempUploadRepository(Protocol):
    """Subidas temporales. `ova_id` es el contexto de la lista (None = crear OVA)."""

    def count_active(self, user_id: str, ova_id: str | None = None) -> int:
        raise NotImplementedError

    def list_active(self, user_id: str, ova_id: str | None = None) -> list[TempUpload]:
        raise NotImplementedError

    def create(
        self,
        user_id: str,
        filename: str,
        content_type: str,
        content: bytes,
        ova_id: str | None = None,
    ) -> TempUpload:
        raise NotImplementedError

    def get(self, upload_id: str, user_id: str) -> TempUpload | None:
        raise NotImplementedError

    def claim(self, user_id: str, upload_ids: list[str], ova_id: str) -> list[TempUpload]:
        """Marca como usadas (confirmed) las subidas del usuario y las liga al OVA:
        salen de su lista y no se vuelven a ofrecer. Devuelve las reclamadas."""
        raise NotImplementedError

    def get_storage_path(self, upload_id: str, user_id: str) -> str | None:
        raise NotImplementedError

    def delete(self, upload_id: str, user_id: str) -> bool:
        raise NotImplementedError

    def set_rag_status(self, upload_id: str, rag_status: dict) -> None:
        raise NotImplementedError


class RagIngestionPort(Protocol):
    def is_enabled(self) -> bool:
        raise NotImplementedError

    def ingest(
        self, *, user_id: str, upload_id: str, storage_path: str, filename: str
    ) -> RagStatus:
        raise NotImplementedError
