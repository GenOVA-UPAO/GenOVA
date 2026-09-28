"""Caso de uso: listar roles con su número de usuarios."""

from __future__ import annotations

from dataclasses import dataclass

from roles.application.dto import RoleView
from roles.application.ports import RoleRepository
from roles.application.views import role_to_view


@dataclass(frozen=True, slots=True)
class ListRoles:
    repo: RoleRepository

    def execute(self) -> list[RoleView]:
        return [
            role_to_view(role, user_count=count)
            for role, count in self.repo.list_with_user_counts()
        ]
