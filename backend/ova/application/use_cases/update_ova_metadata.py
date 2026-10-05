"""Caso de uso: actualizar los metadatos de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from core.educational_metadata import (
    EducationalMetadata,
    InvalidEducationalMetadata,
    metadata_from_ova,
)
from ova.application.dto import OvaMetadataResult, UpdateOvaMetadataInput
from ova.application.ports import OvaLifecycleRepository
from ova.domain.errors import (
    MetadataTitleRequired,
    MetadataTitleTooLong,
    OvaEditError,
    OvaForbidden,
    OvaGenerating,
    OvaNotFound,
)
from ova.domain.model import EDIT_FORBIDDEN


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
        if not ova.can_edit(data.actor):
            raise OvaForbidden(EDIT_FORBIDDEN)
        if ova.status == "generando":
            raise OvaGenerating("No se puede editar el OVA mientras se está generando.")

        try:
            metadata = EducationalMetadata.from_values(**{
                **metadata_from_ova(ova).as_dict(), **data.metadata, "description": description,
            }).as_dict(exclude={"description"})
            if not metadata["author"]:
                metadata["author"] = ova.owner.display_name if ova.owner else ova.author
        except InvalidEducationalMetadata as error:
            raise OvaEditError(422, "invalid_metadata", "Revisa la licencia y los metadatos educativos.") from error
        self.repo.update_metadata(ova.id, title, description, **metadata)
        self.repo.commit("update_ova_metadata")
        return OvaMetadataResult(id=ova.id, title=title, description=description, metadata=metadata)
