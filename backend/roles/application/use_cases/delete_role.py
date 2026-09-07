"""Caso de uso: eliminar un rol (con reasignación de usuarios si hace falta)."""

from __future__ import annotations

from dataclasses import dataclass

from roles.application.dto import DeleteRoleInput
from roles.application.ports import RoleRepository
from roles.domain.errors import (
    InvalidReassignmentTarget,
    ReassignmentRequired,
    ReassignmentTargetNotFound,
    RoleNotFound,
    SystemRoleProtected,
)
from roles.domain.services import is_system_role


@dataclass(frozen=True, slots=True)
class DeleteRole:
    repo: RoleRepository

    def execute(self, data: DeleteRoleInput) -> None:
        role = self.repo.get(data.role_id)
        if role is None:
            raise RoleNotFound()
        if is_system_role(role.name):
            raise SystemRoleProtected("No se pueden eliminar los roles del sistema (administrador, usuario).")

        user_count = self.repo.count_users(data.role_id)
        if user_count > 0:
            self._reassign(data, user_count)

        self.repo.delete(data.role_id)

    def _reassign(self, data: DeleteRoleInput, user_count: int) -> None:
        target = data.reassign_to_id
        if target is None:
            raise ReassignmentRequired(user_count)
        if target == data.role_id:
            raise InvalidReassignmentTarget()
        if self.repo.get(target) is None:
            raise ReassignmentTargetNotFound()
        self.repo.reassign_users(data.role_id, target)
