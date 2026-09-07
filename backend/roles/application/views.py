"""Proyección de entidades de dominio a DTOs de salida."""

from __future__ import annotations

from roles.application.dto import RoleView
from roles.domain.model import Role


def role_to_view(role: Role, user_count: int | None = None) -> RoleView:
    return RoleView(
        id=str(role.id),
        name=role.name,
        description=role.description or "",
        permissions=list(role.permissions or []),
        created_at=role.created_at.isoformat() if role.created_at else None,
        user_count=user_count,
    )
