"""Caso de uso: eliminar una subida temporal del usuario."""

from __future__ import annotations

from dataclasses import dataclass

from uploads.application.ports import TempUploadRepository
from uploads.domain.errors import UploadNotFound


@dataclass(frozen=True, slots=True)
class DeleteUpload:
    repo: TempUploadRepository

    def execute(self, upload_id: str, user_id: str) -> None:
        if not self.repo.delete(upload_id, user_id):
            raise UploadNotFound()
