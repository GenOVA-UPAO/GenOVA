"""Caso de uso: obtener el HTML de un recurso ya generado."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from generation.application.dto import ResourceContentView
from generation.application.ports import JobRepository
from generation.domain.errors import ResourceNotFound, ResourceNotReady


@dataclass(frozen=True, slots=True)
class GetResourceContent:
    repo: JobRepository

    def execute(self, job_id: UUID, resource_id: UUID, user_id: UUID) -> ResourceContentView:
        job = self.repo.get_owned(job_id, user_id)
        if job is None:
            raise ResourceNotFound()
        resource = self.repo.get_resource(job.id, resource_id)
        if resource is None:
            raise ResourceNotFound()
        if resource.status != "done" or not resource.content:
            raise ResourceNotReady()
        return ResourceContentView(
            id=str(resource.id),
            phase_type=resource.phase_type,
            resource_type=resource.resource_type,
            content=resource.content,
        )
