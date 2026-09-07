"""Caso de uso: crear un rol."""

from __future__ import annotations

from dataclasses import dataclass

from roles.application.dto import CreateRoleInput, RoleView
from roles.application.ports import RoleRepository
from roles.application.views import role_to_view
from roles.domain.errors import DuplicateRoleName
from roles.domain.value_objects import RoleName


@dataclass(frozen=True, slots=True)
class CreateRole:
    repo: RoleRepository

    def execute(self, data: CreateRoleInput) -> RoleView:
        name = RoleName(data.name).value
        if self.repo.get_by_name(name) is not None:
            raise DuplicateRoleName()
        role = self.repo.add(name, data.description, data.permissions)
        return role_to_view(role)
