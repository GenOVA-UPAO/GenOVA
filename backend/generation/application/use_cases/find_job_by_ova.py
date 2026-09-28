"""Caso de uso: localizar el último job de un OVA del usuario."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from generation.application.dto import JobStatusView
from generation.application.ports import JobRepository
from generation.application.views import job_to_view
from generation.domain.errors import JobNotFound


@dataclass(frozen=True, slots=True)
class FindJobByOva:
    repo: JobRepository

    def execute(self, ova_id: UUID, user_id: UUID) -> JobStatusView:
        loaded = self.repo.get_owned_by_ova_with_resources(ova_id, user_id)
        if loaded is None:
            raise JobNotFound("No hay generación para este OVA.")
        job, resources = loaded
        return job_to_view(job, resources)
