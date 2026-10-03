"""Caso de uso: consultar el estado de un trabajo de generación."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from generation.application.dto import JobStatusView
from generation.application.ports import JobSnapshotPort
from generation.application.views import job_to_view
from generation.domain.errors import JobNotFound
from generation.domain.eta import EtaItem, estimate_remaining
from generation.domain.job import JobResource
from generation.domain.lifecycle import JOB_TERMINAL


@dataclass(frozen=True, slots=True)
class GetJobStatus:
    repo: JobSnapshotPort
    concurrency: int = 4

    def execute(self, job_id: UUID, user_id: UUID) -> JobStatusView:
        loaded = self.repo.get_owned_with_resources(job_id, user_id)
        if loaded is None:
            raise JobNotFound()
        job, resources = loaded
        return job_to_view(job, resources, self._eta(job.status, resources))

    def _eta(self, job_status: str, resources: list[JobResource]) -> dict | None:
        if job_status in JOB_TERMINAL:
            return None
        now = datetime.now(UTC)
        items = [
            EtaItem(
                key=f"{r.phase_type}:{r.resource_type}",
                status=r.status,
                elapsed=_elapsed(r, now),
            )
            for r in resources
            if r.status in ("pending", "running")
        ]
        keys = [(r.phase_type, str(r.resource_type)) for r in resources if r.resource_type]
        eta = estimate_remaining(items, self.repo.duration_medians(keys), self.concurrency)
        return eta.as_dict() if eta else None


def _elapsed(resource: JobResource, now: datetime) -> float:
    if resource.status != "running" or resource.updated_at is None:
        return 0.0
    started = resource.updated_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=UTC)
    return max((now - started).total_seconds(), 0.0)
