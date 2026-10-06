"""Consulta corta del estado del job y persistencia inmediata de fallos."""

import uuid

from sqlalchemy import select

from core.database import SessionLocal
from models import OvaJob, OvaJobResource


def job_stopped(job_id) -> bool:
    if not job_id:
        return False
    with SessionLocal() as db:
        job = db.get(OvaJob, uuid.UUID(str(job_id)))
        if job is None:
            return False
        return job.status == "canceled" or db.execute(
            select(OvaJobResource.id).where(
                OvaJobResource.job_id == job.id,
                OvaJobResource.defect_reason.in_(("provider_auth", "provider_auth_personal")),
            ).limit(1)
        ).first() is not None


def persist_failure(job_id, phase: str, rt, *, code: str = "generation_failed") -> None:
    if not job_id:
        return
    with SessionLocal() as db:
        resource = db.execute(select(OvaJobResource).where(
            OvaJobResource.job_id == uuid.UUID(str(job_id)),
            OvaJobResource.phase_type == phase,
            OvaJobResource.resource_type == str(rt),
        )).scalar_one_or_none()
        if resource is not None and resource.status != "done":
            resource.status = "error"
            resource.defect_reason = code
            db.commit()
