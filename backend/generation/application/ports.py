"""Puertos (driven) del dominio de generación.

Las implementaciones viven en `infrastructure/` y no importan este módulo:
los Protocol son estructurales.
"""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from generation.domain.job import Job, JobResource


class JobSnapshotPort(Protocol):
    def get_owned_with_resources(
        self, job_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None: ...


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

    def get_owned_by_ova_with_resources(
        self, ova_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None: ...

    def get_resource(self, job_id: UUID, resource_id: UUID) -> JobResource | None: ...

    def resource_ids_in_job(self, job_id: UUID) -> set[UUID]: ...

    def resumable_resource_ids(self, job_id: UUID) -> list[UUID]: ...

    def resumable_subset(self, job_id: UUID, requested: list[UUID]) -> list[UUID]: ...

    def mark_resuming(self, job_id: UUID) -> None: ...

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


class InputGuardrail(Protocol):
    def assert_allowed(self, prompt: str, user_id: UUID) -> None: ...
