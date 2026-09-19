"""Caso de uso: crear una OVA y su paquete SCORM inicial."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ova.application.dto import SaveOvaInput, SaveOvaResult
from ova.application.ports import OvaCreationRepository

ScormZipBuilder = Callable[..., bytes]
ScormZipPersister = Callable[[bytes, str, str, int], tuple[str | None, str | None]]


@dataclass(frozen=True, slots=True)
class SaveOva:
    repo: OvaCreationRepository
    build_scorm_zip: ScormZipBuilder
    persist_scorm_zip: ScormZipPersister

    def execute(self, data: SaveOvaInput) -> SaveOvaResult:
        # El orden no es incidental: los IDs ya existen antes de construir el
        # paquete, y los cambios se confirman solo después de persistirlo.
        ova_id = self.repo.create_ova(data.actor_id, data.title, data.prompt, "listo")
        version_id = self.repo.create_version(ova_id, 1, data.prompt)
        self.repo.add_phases(version_id, data.phases)

        zip_bytes = self.build_scorm_zip(
            course_title=data.title,
            module_title="OVA Generado por GenOVA",
            phases=[
                {
                    "type": phase.type,
                    "order": phase.order,
                    "content": phase.content,
                    "title": phase.title,
                }
                for phase in data.phases
            ],
        )
        storage_key, file_path = self.persist_scorm_zip(zip_bytes, data.actor_id, ova_id, 1)
        self.repo.set_scorm_package(ova_id, version_id, storage_key, file_path)
        self.repo.commit("save_ova")

        # La promoción es deliberadamente posterior al commit y tolerante a
        # fallos: un error de RAG nunca invalida una OVA ya guardada.
        if data.upload_ids:
            self.repo.tie_uploads_to_ova(data.upload_ids, ova_id)
        return SaveOvaResult(ova_id=ova_id)
