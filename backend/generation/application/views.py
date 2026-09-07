"""Proyección de entidades de dominio a DTOs de salida."""

from __future__ import annotations

from generation.application.dto import JobStatusView, ResourceStatusView
from generation.domain.job import Job, JobResource


def job_to_view(job: Job, resources: list[JobResource]) -> JobStatusView:
    return JobStatusView(
        job_id=str(job.id),
        ova_id=str(job.ova_id) if job.ova_id else None,
        status=job.status,
        created_at=job.created_at.isoformat() if job.created_at else None,
        updated_at=job.updated_at.isoformat() if job.updated_at else None,
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
        resources=tuple(_resource_view(r) for r in resources),
    )


def _resource_view(resource: JobResource) -> ResourceStatusView:
    return ResourceStatusView(
        id=str(resource.id),
        phase_type=resource.phase_type,
        phase_order=resource.phase_order,
        resource_type=resource.resource_type,
        resource_order=resource.resource_order,
        title=resource.title,
        emoji=resource.emoji,
        status=resource.status,
        attempts=resource.attempts,
        error_id=str(resource.error_id) if resource.error_id else None,
        defect_reason=resource.defect_reason,
    )
