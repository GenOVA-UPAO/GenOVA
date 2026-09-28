"""Caso de uso: cambiar el rol de un usuario gestionado (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminUpdateRoleInput
from users.application.ports import AdminUserRepository
from users.domain.admin import assert_not_self, parse_role_id, parse_user_id
from users.domain.errors import AdminRoleAssignmentForbidden, AdminRoleNotFound


@dataclass(frozen=True, slots=True)
class AdminUpdateRole:
    repo: AdminUserRepository

    def execute(self, data: AdminUpdateRoleInput):
        target_uuid = parse_user_id(data.user_id)
        role_uuid = parse_role_id(data.role_id)

        assert_not_self(caller_id=data.caller_id, target_id=target_uuid)
        self.repo.assert_can_touch_target(caller_id=data.caller_id, target_id=target_uuid)
        self.repo.get_target(target_uuid)

        role = self.repo.get_role(role_uuid)
        if role is None:
            raise AdminRoleNotFound()

        # El chequeo de admin del caller solo corre si el rol destino es
        # administrador (mismo cortocircuito que el router original).
        if role.name == "administrador" and not self.repo.is_admin(data.caller_id):
            raise AdminRoleAssignmentForbidden()

        return self.repo.replace_role(target_uuid, role_uuid)
