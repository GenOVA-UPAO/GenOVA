"""Entidades puras usadas por el ciclo de vida de una OVA."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class OvaActor:
    id: str
    is_admin: bool


@dataclass(frozen=True, slots=True)
class OvaOwner:
    id: str
    display_name: str


@dataclass(frozen=True, slots=True)
class OvaPhase:
    type: str
    order: int
    content: str
    title: str | None = None
    resource_type_id: int | None = None


@dataclass(frozen=True, slots=True)
class Ova:
    id: str
    owner_id: str
    title: str
    description: str | None
    status: str
    file_path: str | None
    storage_key: str | None
    version_number: int | None
    created_at: datetime | None
    updated_at: datetime | None
    deleted_at: datetime | None
    owner: OvaOwner | None = None

    def is_accessible_by(self, actor: OvaActor) -> bool:
        return actor.is_admin or self.owner_id == actor.id
