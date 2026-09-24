"""Caso de uso: dar por usadas unas subidas y ligarlas a un OVA."""

from __future__ import annotations

from dataclasses import dataclass

from uploads.application.dto import UploadItemView
from uploads.application.ports import TempUploadRepository
from uploads.application.views import to_view


@dataclass(frozen=True, slots=True)
class ClaimUploads:
    """Al crear un OVA (o aplicar un cambio en su chat) los archivos adjuntos
    pasan a ser material de ese OVA: dejan la lista temporal en la que se
    subieron para que no reaparezcan en «Archivos» del siguiente OVA ni en el
    chat. Solo reclama subidas del propio usuario."""

    repo: TempUploadRepository

    def execute(self, user_id: str, upload_ids: list[str], ova_id: str) -> list[UploadItemView]:
        if not upload_ids:
            return []
        return [to_view(u) for u in self.repo.claim(user_id, list(upload_ids), ova_id)]
