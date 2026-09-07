"""Núcleo de dominio de generación. Sin dependencias de framework ni de otras capas."""

from generation.domain.errors import (
    GenerationError,
    JobAlreadyRunning,
    JobNotFound,
    JobNotRunning,
    ResourceNotFound,
    ResourceNotReady,
)
from generation.domain.job import Job, JobResource
from generation.domain.lifecycle import (
    JOB_STATUSES,
    JOB_STREAM_TERMINAL,
    JOB_TERMINAL,
    RESOURCE_STATUSES,
    can_cancel,
    is_stream_terminal,
)

__all__ = [
    "JOB_STATUSES",
    "JOB_STREAM_TERMINAL",
    "JOB_TERMINAL",
    "RESOURCE_STATUSES",
    "GenerationError",
    "JobAlreadyRunning",
    "Job",
    "JobNotFound",
    "JobNotRunning",
    "JobResource",
    "ResourceNotFound",
    "ResourceNotReady",
    "can_cancel",
    "is_stream_terminal",
]
