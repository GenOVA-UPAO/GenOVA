"""Entidades del dominio de roles — puras, sin ORM."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Role:
    id: UUID
    name: str
    description: str = ""
    permissions: list[str] = field(default_factory=list)
    created_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class UserRoleLink:
    user_id: UUID
    role_id: UUID
    is_primary: bool = False
