"""Caso de uso: cancelar un trabajo de generación en curso."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from generation.application.dto import CancelJobResult
from generation.application.ports import JobRepository
from generation.domain.errors import JobNotFound, JobNotRunning
from generation.domain.lifecycle import can_cancel


@dataclass(frozen=True, slots=True)
class CancelJob:
    repo: JobRepository

    def execute(self, job_id: UUID, user_id: UUID) -> CancelJobResult:
        job = self.repo.get_owned(job_id, user_id)
        if job is None:
            raise JobNotFound()
        if not can_cancel(job.status):
            raise JobNotRunning()
        self.repo.cancel(job.id)
        return CancelJobResult(job_id=str(job.id), status="canceled")
