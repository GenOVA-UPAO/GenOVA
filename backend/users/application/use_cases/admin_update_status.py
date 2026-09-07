"""Caso de uso: activar o desactivar un usuario gestionado (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminStatusResult, AdminUpdateStatusInput
from users.application.ports import AdminUserRepository
from users.domain.admin import parse_user_id
from users.domain.errors import SelfDeactivationForbidden


@dataclass(frozen=True, slots=True)
class AdminUpdateStatus:
    repo: AdminUserRepository

    def execute(self, data: AdminUpdateStatusInput) -> AdminStatusResult:
        target_uuid = parse_user_id(data.user_id)
        if target_uuid == data.caller_id:
            raise SelfDeactivationForbidden()
        self.repo.assert_can_touch_target(caller_id=data.caller_id, target_id=target_uuid)
        self.repo.get_target(target_uuid)

        is_active = self.repo.set_status(target_uuid, data.is_active)
        return AdminStatusResult(id=str(target_uuid), is_active=is_active)
