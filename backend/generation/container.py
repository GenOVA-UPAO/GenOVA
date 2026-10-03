"""Composition root del dominio de generación.

FastAPI es el contenedor: ``Depends(build_generation)`` en el router cablea
los casos de uso con sus adaptadores concretos. El stream SSE usa
``build_generation_stream`` para no retener una sesión de DB durante la
conexión larga.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal, get_db
from generation.application.use_cases import (
    CancelJob,
    CreateJob,
    FindJobByOva,
    GetJobStatus,
    GetResourceContent,
    ResumeJob,
)
from generation.infrastructure.image_settings import LlmImageSettingsResolver
from generation.infrastructure.input_guardrail import InputGuardrailChecker
from generation.infrastructure.job_launcher import ThreadOrQueueJobLauncher
from generation.infrastructure.reference_material import ReferenceMaterialAdapter
from generation.infrastructure.sqlalchemy_job_repository import (
    FreshSessionJobRepository,
    SqlAlchemyJobRepository,
)


@dataclass(frozen=True, slots=True)
class GenerationUseCases:
    create_job: CreateJob
    get_job_status: GetJobStatus
    find_job_by_ova: FindJobByOva
    get_resource_content: GetResourceContent
    cancel_job: CancelJob
    resume_job: ResumeJob


def build_generation(db: Session = Depends(get_db)) -> GenerationUseCases:
    repo = SqlAlchemyJobRepository(db)
    launcher = ThreadOrQueueJobLauncher()
    return GenerationUseCases(
        create_job=CreateJob(
            repo=repo,
            images=LlmImageSettingsResolver(db),
            launcher=launcher,
            guardrail=InputGuardrailChecker(),
            references=ReferenceMaterialAdapter(db),
        ),
        get_job_status=GetJobStatus(repo=repo, concurrency=settings.ova_gen_concurrency),
        find_job_by_ova=FindJobByOva(repo=repo),
        get_resource_content=GetResourceContent(repo=repo),
        cancel_job=CancelJob(repo=repo),
        resume_job=ResumeJob(repo=repo, launcher=launcher),
    )


def build_generation_stream() -> GetJobStatus:
    return GetJobStatus(repo=FreshSessionJobRepository(), concurrency=settings.ova_gen_concurrency)


class FreshSessionContentReader:
    """Lee el HTML de un recurso listo con sesión corta (eventos `resource` del SSE)."""

    def execute(self, job_id, resource_id, user_id):
        db = SessionLocal()
        try:
            return GetResourceContent(repo=SqlAlchemyJobRepository(db)).execute(
                job_id, resource_id, user_id
            )
        finally:
            db.close()


def build_resource_content_reader() -> FreshSessionContentReader:
    return FreshSessionContentReader()
