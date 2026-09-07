"""Caso de uso: listar las subidas temporales activas del usuario."""

from __future__ import annotations

from dataclasses import dataclass

from uploads.application.dto import UploadItemView
from uploads.application.ports import TempUploadRepository
from uploads.application.views import to_view


@dataclass(frozen=True, slots=True)
class ListUploads:
    repo: TempUploadRepository

    def execute(self, user_id: str) -> list[UploadItemView]:
        return [to_view(u) for u in self.repo.list_active(user_id)]
