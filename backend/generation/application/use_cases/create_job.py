"""Caso de uso: encolar un trabajo de generación de OVA."""

from __future__ import annotations

from dataclasses import dataclass

from generation.application.dto import CreateJobInput, CreateJobResult
from generation.application.ports import ImageSettingsResolver, JobLauncher, JobRepository


@dataclass(frozen=True, slots=True)
class CreateJob:
    repo: JobRepository
    images: ImageSettingsResolver
    launcher: JobLauncher

    def execute(self, data: CreateJobInput) -> CreateJobResult:
        image_settings = self.images.resolve(
            ova_settings=data.ova_settings,
            user_api_keys=data.user_api_keys,
            user_id=data.user_id,
        )
        params = {
            "upload_ids": list(data.upload_ids),
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
        self.launcher.launch(job.id)
        return CreateJobResult(
            job_id=str(job.id),
            ova_id=str(job.ova_id) if job.ova_id else None,
            status="queued",
        )
