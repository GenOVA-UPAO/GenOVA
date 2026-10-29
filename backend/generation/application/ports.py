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
    ) -> tuple[Job, list[JobResource]] | None:
        raise NotImplementedError

    def duration_medians(self, keys: list[tuple[str, str]]) -> dict[str, float]:
        raise NotImplementedError


class JobRepository(Protocol):
    def create(
        self,
        *,
        user_id: UUID,
        prompt: str,
        params: dict,
        resources: list[dict],
    ) -> Job:
        raise NotImplementedError

    def get_owned(self, job_id: UUID, user_id: UUID) -> Job | None:
        raise NotImplementedError

    def get_owned_with_resources(
        self, job_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None:
        raise NotImplementedError

    def get_owned_by_ova_with_resources(
        self, ova_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None:
        raise NotImplementedError

    def get_resource(self, job_id: UUID, resource_id: UUID) -> JobResource | None:
        raise NotImplementedError

    def resource_ids_in_job(self, job_id: UUID) -> set[UUID]:
        raise NotImplementedError

    def resumable_resource_ids(self, job_id: UUID) -> list[UUID]:
        raise NotImplementedError

    def resumable_subset(self, job_id: UUID, requested: list[UUID]) -> list[UUID]:
        raise NotImplementedError

    def mark_resuming(self, job_id: UUID) -> None:
        raise NotImplementedError

    def cancel(self, job_id: UUID) -> None:
        raise NotImplementedError


class JobLauncher(Protocol):
    def launch(self, job_id: UUID, only: list[UUID] | None = None) -> None:
        raise NotImplementedError


class ImageSettingsResolver(Protocol):
    def resolve(
        self,
        *,
        ova_settings: dict,
        user_api_keys: dict,
        user_id: UUID,
    ) -> dict:
        raise NotImplementedError


class InputGuardrail(Protocol):
    def assert_allowed(self, prompt: str, user_id: UUID) -> None:
        raise NotImplementedError


class TopicAreaSource(Protocol):
    """Área temática que el admin fijó para todos los OVAs (o "" si no hay)."""

    def active_area(self) -> str:
        raise NotImplementedError


class ReferenceMaterial(Protocol):
    """Archivos de referencia (RAG) que el docente adjunta a un OVA."""

    def owned(self, user_id: UUID, upload_ids: list[str]) -> list[str]:
        """Los ids que de verdad son del usuario (el resto se descarta)."""
        raise NotImplementedError

    def bind_to_ova(self, user_id: UUID, upload_ids: list[str], ova_id: str) -> None:
        """Los saca de la lista temporal en la que se subieron y los liga al OVA."""
        raise NotImplementedError
