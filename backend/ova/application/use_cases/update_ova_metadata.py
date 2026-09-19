"""Caso de uso: actualizar los metadatos de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import OvaMetadataResult, UpdateOvaMetadataInput
from ova.application.ports import OvaLifecycleRepository
from ova.domain.errors import (
    MetadataTitleRequired,
    MetadataTitleTooLong,
    OvaForbidden,
    OvaGenerating,
    OvaNotFound,
)


@dataclass(frozen=True, slots=True)
class UpdateOvaMetadata:
    repo: OvaLifecycleRepository

    def execute(self, data: UpdateOvaMetadataInput) -> OvaMetadataResult:
        title = data.title.strip()
        description = (data.description or "").strip() or None
        if not title:
            raise MetadataTitleRequired()
        if len(title) > 100:
            raise MetadataTitleTooLong()

        ova = self.repo.get_active(data.ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado o ya eliminado.")
        if not ova.is_accessible_by(data.actor):
            raise OvaForbidden("No tienes permiso para editar este OVA.")
        if ova.status == "generando":
            raise OvaGenerating("No se puede editar el OVA mientras se está generando.")

        self.repo.update_metadata(ova.id, title, description)
        self.repo.commit("update_ova_metadata")
        return OvaMetadataResult(id=ova.id, title=title, description=description)
