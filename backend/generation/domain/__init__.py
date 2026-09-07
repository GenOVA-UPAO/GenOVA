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
from generation.domain.resource_outcome import (
    CONTENT_READY_STATUSES,
    MATERIALIZABLE_STATUSES,
    RESOURCE_DEGRADED,
    defect_reason,
    is_content_ready,
    persist_status,
)

__all__ = [
    "JOB_STATUSES",
    "JOB_STREAM_TERMINAL",
    "JOB_TERMINAL",
    "CONTENT_READY_STATUSES",
    "MATERIALIZABLE_STATUSES",
    "RESOURCE_DEGRADED",
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
    "defect_reason",
    "is_content_ready",
    "is_stream_terminal",
    "persist_status",
]
