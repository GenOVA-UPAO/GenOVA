"""Puertos estructurales del ciclo de vida de una OVA."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from ova.domain.model import Ova, OvaPhase


class OvaLifecycleRepository(Protocol):
    def get_active(self, ova_id: str) -> Ova | None: ...

    def get_trashed(self, ova_id: str) -> Ova | None: ...

    def count_trashed(self, owner_id: str | None) -> int: ...

    def list_trashed(self, owner_id: str | None, offset: int, limit: int) -> list[Ova]: ...

    def update_metadata(self, ova_id: str, title: str, description: str | None) -> None: ...

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None: ...

    def restore(self, ova_id: str) -> None: ...

    def stage_permanent_delete(self, ova_id: str) -> None: ...

    def commit(self, operation: str) -> None: ...


class ScormPackageCleaner(Protocol):
    def delete(self, file_path: str | None, storage_key: str | None) -> None: ...


class OvaCreationRepository(Protocol):
    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str: ...

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str: ...

    def add_phases(self, version_id: str, phases: tuple[OvaPhase, ...]) -> None: ...

    def set_scorm_package(
        self,
        ova_id: str,
        version_id: str,
        storage_key: str | None,
        file_path: str | None,
    ) -> None: ...

    def tie_uploads_to_ova(self, upload_ids: tuple[str, ...], ova_id: str) -> None: ...

    def commit(self, operation: str) -> None: ...
