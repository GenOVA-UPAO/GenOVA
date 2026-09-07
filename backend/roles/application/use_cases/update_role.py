"""Caso de uso: actualizar un rol."""

from __future__ import annotations

from dataclasses import dataclass

from roles.application.dto import RoleView, UpdateRoleInput
from roles.application.ports import RoleRepository
from roles.application.views import role_to_view
from roles.domain.errors import DuplicateRoleName, RoleNotFound, SystemRoleProtected
from roles.domain.services import is_system_role
from roles.domain.value_objects import RoleName


@dataclass(frozen=True, slots=True)
class UpdateRole:
    repo: RoleRepository

    def execute(self, data: UpdateRoleInput) -> RoleView:
        role = self.repo.get(data.role_id)
        if role is None:
            raise RoleNotFound()
        if is_system_role(role.name):
            raise SystemRoleProtected()

        new_name = self._resolve_name(data.name, data.role_id)
        updated = self.repo.update(
            data.role_id,
            name=new_name,
            description=data.description,
            permissions=data.permissions,
        )
        return role_to_view(updated)

    def _resolve_name(self, raw: str | None, role_id: object) -> str | None:
        if raw is None:
            return None
        name = RoleName(raw).value
        clash = self.repo.get_by_name(name)
        if clash is not None and clash.id != role_id:
            raise DuplicateRoleName("Ya existe otro rol con ese nombre.")
        return name
