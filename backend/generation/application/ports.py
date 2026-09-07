"""Puertos (driven) del dominio de generación.

Las implementaciones viven en `infrastructure/` y no importan este módulo:
los Protocol son estructurales.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from generation.domain.job import Job, JobResource


class JobRepository(Protocol):
    def create(
        self,
        *,
        user_id: UUID,
        prompt: str,
        params: dict,
        resources: list[dict],
    ) -> Job: ...

    def get_owned(self, job_id: UUID, user_id: UUID) -> Job | None: ...

    def get_owned_with_resources(
        self, job_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None: ...

    def cancel(self, job_id: UUID) -> None: ...


class JobLauncher(Protocol):
    def launch(self, job_id: UUID, only: list[UUID] | None = None) -> None: ...


class ImageSettingsResolver(Protocol):
    def resolve(
        self,
        *,
        ova_settings: dict,
        user_api_keys: dict,
        user_id: UUID,
    ) -> dict: ...
