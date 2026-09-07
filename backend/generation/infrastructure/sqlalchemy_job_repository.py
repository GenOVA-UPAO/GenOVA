"""Repositorio SQLAlchemy del ciclo de vida de un job.

Delega en `jobs_service` (misma persistencia que runner/tests) y mapea a
entidades de dominio. No importa `generation.application`.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import SessionLocal
from generation.domain.job import Job, JobResource
from generation.infrastructure.mappers import to_job, to_resource
from generation.jobs import jobs_service
from models import OvaJob


class SqlAlchemyJobRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create(
        self,
        *,
        user_id: UUID,
        prompt: str,
        params: dict,
        resources: list[dict],
    ) -> Job:
        orm = jobs_service.create_job(
            self._db,
            user_id=user_id,
            prompt=prompt,
            params=params,
            resources=resources,
        )
        return to_job(orm)

    def get_owned(self, job_id: UUID, user_id: UUID) -> Job | None:
        orm = jobs_service.get_job(self._db, job_id, user_id)
        return to_job(orm) if orm is not None else None

    def get_owned_with_resources(
        self, job_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None:
        orm = jobs_service.get_job(self._db, job_id, user_id)
        if orm is None:
            return None
        resources = jobs_service.list_resources(self._db, orm.id)
        return to_job(orm), [to_resource(r) for r in resources]

    def get_owned_by_ova_with_resources(
        self, ova_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None:
        orm = jobs_service.find_job_by_ova(self._db, ova_id, user_id)
        if orm is None:
            return None
        resources = jobs_service.list_resources(self._db, orm.id)
        return to_job(orm), [to_resource(r) for r in resources]

    def cancel(self, job_id: UUID) -> None:
        orm = self._db.execute(select(OvaJob).where(OvaJob.id == job_id)).scalar_one()
        jobs_service.cancel_job(self._db, orm)


class FreshSessionJobRepository:
    """Abre una sesión corta por lectura para que el SSE vea los commits del runner."""

    def get_owned_with_resources(
        self, job_id: UUID, user_id: UUID
    ) -> tuple[Job, list[JobResource]] | None:
        db = SessionLocal()
        try:
            return SqlAlchemyJobRepository(db).get_owned_with_resources(job_id, user_id)
        finally:
            db.close()
