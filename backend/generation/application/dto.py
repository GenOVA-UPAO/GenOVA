"""DTOs de entrada/salida de los casos de uso de generación (sin pydantic)."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True, slots=True)
class CreateJobInput:
    user_id: UUID
    prompt: str
    resource_plan: list[dict]
    upload_ids: list[str] = field(default_factory=list)
    phases: list[str] = field(default_factory=list)
    resources: list[dict] = field(default_factory=list)
    theme: dict = field(default_factory=dict)
    resource_configs: dict = field(default_factory=dict)
    llm_settings: dict = field(default_factory=dict)
    enabled_models: list = field(default_factory=list)
    ova_settings: dict = field(default_factory=dict)
    user_api_keys: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class CreateJobResult:
    job_id: str
    ova_id: str | None
    status: str


@dataclass(frozen=True, slots=True)
class ResourceStatusView:
    id: str
    phase_type: str
    phase_order: int
    resource_type: str | None
    resource_order: int
    title: str
    emoji: str
    status: str
    attempts: int
    error_id: str | None

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "phase_type": self.phase_type,
            "phase_order": self.phase_order,
            "resource_type": self.resource_type,
            "resource_order": self.resource_order,
            "title": self.title,
            "emoji": self.emoji,
            "status": self.status,
            "attempts": self.attempts,
            "error_id": self.error_id,
        }


@dataclass(frozen=True, slots=True)
class JobStatusView:
    """Misma forma que `job_to_dict` — polling y SSE comparten el sobre."""

    job_id: str
    ova_id: str | None
    status: str
    created_at: str | None
    updated_at: str | None
    started_at: str | None
    finished_at: str | None
    resources: tuple[ResourceStatusView, ...] = ()

    def as_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "ova_id": self.ova_id,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "resources": [r.as_dict() for r in self.resources],
        }


@dataclass(frozen=True, slots=True)
class CancelJobResult:
    job_id: str
    status: str
