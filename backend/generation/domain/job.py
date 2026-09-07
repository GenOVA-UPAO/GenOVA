"""Entidades puras del ciclo de vida de un job de generación."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Job:
    id: UUID
    user_id: UUID
    ova_id: UUID | None
    status: str
    prompt: str = ""
    params: dict = field(default_factory=dict)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class JobResource:
    id: UUID
    job_id: UUID
    phase_type: str
    phase_order: int
    resource_type: str | None
    resource_order: int
    status: str
    attempts: int = 0
    error_id: UUID | None = None
    title: str = ""
    emoji: str = ""
