"""Puertos (driven) del dominio de roles."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from roles.domain.model import Role


class RoleRepository(Protocol):
    """Persistencia de roles. La implementación vive en `infrastructure/`."""

    def list_with_user_counts(self) -> list[tuple[Role, int]]: ...

    def get(self, role_id: UUID) -> Role | None: ...

    def get_by_name(self, name: str) -> Role | None: ...

    def add(self, name: str, description: str, permissions: list[str]) -> Role: ...

    def update(
        self,
        role_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        permissions: list[str] | None = None,
    ) -> Role: ...

    def count_users(self, role_id: UUID) -> int: ...

    def reassign_users(self, from_role_id: UUID, to_role_id: UUID) -> None:
        """Mueve las asignaciones de `from_role_id` a `to_role_id`.

        Si un usuario ya tiene el rol destino, la asignación vieja se descarta
        (sin duplicar la clave primaria de user_roles).
        """
        ...

    def delete(self, role_id: UUID) -> None: ...
