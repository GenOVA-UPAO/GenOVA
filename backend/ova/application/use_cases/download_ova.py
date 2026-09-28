"""Caso de uso: descargar el paquete SCORM de una OVA lista."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import ManageOvaInput, PackageDownload
from ova.application.ports import OvaLifecycleRepository, PackageSource
from ova.domain.editor import scorm_filename_stem
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound


@dataclass(frozen=True, slots=True)
class DownloadOva:
    ovas: OvaLifecycleRepository
    packages: PackageSource

    def execute(self, data: ManageOvaInput) -> PackageDownload:
        ova = self.ovas.get_active(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("No tienes permiso para descargar este OVA.")
        if ova.status != "listo":
            raise OvaEditError(409, "ova_not_ready", "El OVA aún no está listo para descargar.")
        filename = f"{scorm_filename_stem(ova.title)}.zip"
        url = self.packages.try_signed_url(ova.storage_key, filename)
        if url is not None:
            return PackageDownload(kind="url", filename=filename, url=url)
        if not self.packages.disk_available(ova.file_path):
            raise OvaEditError(404, "file_not_found", "El archivo del OVA no está disponible.")
        return PackageDownload(kind="file", filename=filename, file_path=ova.file_path)
