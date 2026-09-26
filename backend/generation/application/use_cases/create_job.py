"""Caso de uso: encolar un trabajo de generación de OVA."""

from __future__ import annotations

from dataclasses import dataclass

from generation.application.dto import CreateJobInput, CreateJobResult
from generation.application.ports import (
    ImageSettingsResolver,
    InputGuardrail,
    JobLauncher,
    JobRepository,
    ReferenceMaterial,
)


@dataclass(frozen=True, slots=True)
class CreateJob:
    repo: JobRepository
    images: ImageSettingsResolver
    launcher: JobLauncher
    guardrail: InputGuardrail
    # Opcional para no obligar a cada doble de test a traerlo: sin él los ids
    # pasan tal cual (comportamiento anterior).
    references: ReferenceMaterial | None = None

    def execute(self, data: CreateJobInput) -> CreateJobResult:
        self.guardrail.assert_allowed(data.prompt, data.user_id)
        image_settings = self.images.resolve(
            ova_settings=data.ova_settings,
            user_api_keys=data.user_api_keys,
            user_id=data.user_id,
        )
        # Solo archivos del propio usuario: con el id de un documento ajeno se
        # recuperaba su contenido como contexto.
        upload_ids = list(data.upload_ids)
        if self.references is not None:
            upload_ids = self.references.owned(data.user_id, upload_ids)
        params = {
            "upload_ids": upload_ids,
            "phases": list(data.phases),
            "resources": list(data.resources),
            "theme": dict(data.theme),
            "llm_config": data.llm_settings or {},
            "enabled_models": data.enabled_models or [],
            "image_settings": image_settings or {},
            "resource_configs": dict(data.resource_configs),
        }
        job = self.repo.create(
            user_id=data.user_id,
            prompt=data.prompt,
            params=params,
            resources=data.resource_plan,
        )
        if self.references is not None and job.ova_id and upload_ids:
            self.references.bind_to_ova(data.user_id, upload_ids, str(job.ova_id))
        self.launcher.launch(job.id)
        return CreateJobResult(
            job_id=str(job.id),
            ova_id=str(job.ova_id) if job.ova_id else None,
            status="queued",
        )
