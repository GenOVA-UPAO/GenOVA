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

from core.database import get_db
from generation.application.use_cases import (
    CancelJob,
    CreateJob,
    FindJobByOva,
    GetJobStatus,
    GetResourceContent,
)
from generation.infrastructure.image_settings import LlmImageSettingsResolver
from generation.infrastructure.job_launcher import ThreadOrQueueJobLauncher
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


def build_generation(db: Session = Depends(get_db)) -> GenerationUseCases:
    repo = SqlAlchemyJobRepository(db)
    return GenerationUseCases(
        create_job=CreateJob(
            repo=repo,
            images=LlmImageSettingsResolver(db),
            launcher=ThreadOrQueueJobLauncher(),
        ),
        get_job_status=GetJobStatus(repo=repo),
        find_job_by_ova=FindJobByOva(repo=repo),
        get_resource_content=GetResourceContent(repo=repo),
        cancel_job=CancelJob(repo=repo),
    )


def build_generation_stream() -> GetJobStatus:
    return GetJobStatus(repo=FreshSessionJobRepository())
