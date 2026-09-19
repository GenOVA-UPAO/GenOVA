"""Conversión ORM -> entidad de dominio."""

from __future__ import annotations

from generation.domain.job import Job, JobResource
from models import OvaJob, OvaJobResource


def to_job(orm: OvaJob) -> Job:
    return Job(
        id=orm.id,
        user_id=orm.user_id,
        ova_id=orm.ova_id,
        status=orm.status,
        prompt=orm.prompt or "",
        params=dict(orm.params or {}),
        created_at=orm.created_at,
        updated_at=orm.updated_at,
        started_at=orm.started_at,
        finished_at=orm.finished_at,
    )


def to_resource(orm: OvaJobResource) -> JobResource:
    from generation.jobs.jobs_materialize import resolve_resource_display

    _rid, title, emoji = resolve_resource_display(orm.phase_type, orm.resource_type)
    return JobResource(
        id=orm.id,
        job_id=orm.job_id,
        phase_type=orm.phase_type,
        phase_order=orm.phase_order,
        resource_type=orm.resource_type,
        resource_order=orm.resource_order,
        status=orm.status,
        attempts=orm.attempts,
        error_id=orm.error_id,
        title=title,
        emoji=emoji,
        content=orm.content,
        defect_reason=orm.defect_reason,
    )
