"""Caso de uso: consultar el estado de un trabajo de generación."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from generation.application.dto import JobStatusView
from generation.application.ports import JobSnapshotPort
from generation.application.views import job_to_view
from generation.domain.errors import JobNotFound


@dataclass(frozen=True, slots=True)
class GetJobStatus:
    repo: JobSnapshotPort

    def execute(self, job_id: UUID, user_id: UUID) -> JobStatusView:
        loaded = self.repo.get_owned_with_resources(job_id, user_id)
        if loaded is None:
            raise JobNotFound()
        job, resources = loaded
        return job_to_view(job, resources)
