"""Caso de uso: reanudar un trabajo interrumpido o con error."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from generation.application.dto import ResumeJobInput, ResumeJobResult
from generation.application.ports import JobLauncher, JobRepository
from generation.domain.errors import JobAlreadyRunning, JobNotFound, ResourceNotFound


def _parse_uuid(raw: str) -> UUID | None:
    try:
        return UUID(raw)
    except (ValueError, TypeError):
        return None


@dataclass(frozen=True, slots=True)
class ResumeJob:
    repo: JobRepository
    launcher: JobLauncher

    def execute(self, data: ResumeJobInput) -> ResumeJobResult:
        job = self.repo.get_owned(data.job_id, data.user_id)
        if job is None:
            raise JobNotFound()
        if job.status == "running":
            raise JobAlreadyRunning()
        targets = self._targets(job.id, data.resource_ids)
        if not targets:
            return ResumeJobResult(
                job_id=str(job.id), status=job.status, resumed=0, accepted=False
            )
        self.repo.mark_resuming(job.id)
        self.launcher.launch(job.id, targets)
        return ResumeJobResult(
            job_id=str(job.id), status="running", resumed=len(targets), accepted=True
        )

    def _targets(self, job_id: UUID, resource_ids: tuple[str, ...]) -> list[UUID]:
        if not resource_ids:
            return self.repo.resumable_resource_ids(job_id)
        parsed: list[UUID] = []
        for raw in resource_ids:
            rid = _parse_uuid(raw)
            if rid is None:
                raise ResourceNotFound()
            parsed.append(rid)
        owned = self.repo.resource_ids_in_job(job_id)
        if any(rid not in owned for rid in parsed):
            raise ResourceNotFound()
        return self.repo.resumable_subset(job_id, parsed)
