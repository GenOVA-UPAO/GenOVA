"""Caso de uso: GET /{ova_id}/scorm — redirect 302 o bytes en disco."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import ManageOvaInput, PackageDownload
from ova.application.ports import OvaLifecycleRepository, PackageSource
from ova.domain.errors import OvaEditError, OvaNotFound


def _attachment_filename(title: str) -> str:
    stem = "".join(c for c in title if c.isalnum() or c in " _-")[:40].strip()
    return f"{stem}-scorm.zip"


@dataclass(frozen=True, slots=True)
class DownloadOvaScorm:
    ovas: OvaLifecycleRepository
    packages: PackageSource

    def execute(self, data: ManageOvaInput) -> PackageDownload:
        ova = self.ovas.get_active(data.ova_id)
        if ova is None or (not data.actor.is_admin and ova.owner_id != data.actor.id):
            raise OvaNotFound("OVA no encontrado.")
        url = self.packages.try_signed_url(ova.storage_key, filename=None, ova_id=data.ova_id)
        if url is not None:
            return PackageDownload(kind="redirect", filename="", url=url)
        if not self.packages.disk_available(ova.file_path):
            raise OvaEditError(404, "file_not_found", "Archivo SCORM no disponible aún.")
        return PackageDownload(
            kind="file",
            filename=_attachment_filename(ova.title),
            file_path=ova.file_path,
        )
