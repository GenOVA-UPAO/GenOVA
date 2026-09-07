"""Puertos estructurales del ciclo de vida de una OVA."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from ova.domain.model import Ova


class OvaLifecycleRepository(Protocol):
    def get_active(self, ova_id: str) -> Ova | None: ...

    def update_metadata(self, ova_id: str, title: str, description: str | None) -> None: ...

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None: ...

    def commit(self, operation: str) -> None: ...


class ScormPackageCleaner(Protocol):
    def delete(self, file_path: str | None, storage_key: str | None) -> None: ...
