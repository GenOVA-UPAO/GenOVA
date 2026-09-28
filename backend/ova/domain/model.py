"""Entidades puras usadas por el ciclo de vida de una OVA."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class OvaActor:
    id: str
    is_admin: bool


# Un OVA es obra de quien lo creó (profesor o alumno): solo esa persona lo
# modifica. El admin lo ve (soporte, moderación) pero no lo edita; retirarlo
# es una acción aparte (papelera), no una edición.
EDIT_FORBIDDEN = "Solo quien creó el OVA puede modificarlo."


def can_read_ova(owner_id: str, actor: OvaActor) -> bool:
    return actor.is_admin or owner_id == actor.id


def can_edit_ova(owner_id: str, actor: OvaActor) -> bool:
    return owner_id == actor.id


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
class OvaDuplicateSource:
    owner_id: str
    title: str
    description: str | None
    status: str
    prompt: str
    phases: tuple[OvaPhase, ...]


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
        return can_read_ova(self.owner_id, actor)

    def can_edit(self, actor: OvaActor) -> bool:
        return can_edit_ova(self.owner_id, actor)
