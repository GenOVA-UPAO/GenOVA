"""Conversión ORM -> entidad de dominio."""

from __future__ import annotations

from roles.domain.model import Role as DomainRole
from roles.infrastructure.orm import Role as RoleORM


def to_domain(orm: RoleORM) -> DomainRole:
    return DomainRole(
        id=orm.id,
        name=orm.name,
        description=orm.description or "",
        permissions=list(orm.permissions or []),
        created_at=orm.created_at,
    )
