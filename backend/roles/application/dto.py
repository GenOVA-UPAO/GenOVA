"""DTOs de entrada/salida de los casos de uso de roles (sin pydantic)."""

from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID


@dataclass(frozen=True, slots=True)
class CreateRoleInput:
    name: str
    description: str = ""
    permissions: list[str] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class UpdateRoleInput:
    role_id: UUID
    name: str | None = None
    description: str | None = None
    permissions: list[str] | None = None


@dataclass(frozen=True, slots=True)
class DeleteRoleInput:
    role_id: UUID
    reassign_to_id: UUID | None = None


@dataclass(frozen=True, slots=True)
class RoleView:
    """Representación de salida de un rol para la capa de interfaz."""

    id: str
    name: str
    description: str
    permissions: list[str]
    created_at: str | None
    user_count: int | None = None
