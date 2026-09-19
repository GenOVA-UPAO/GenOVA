"""Caso de uso: disparar el correo de restablecimiento de un usuario gestionado.

Emite el token y lo persiste; el envío del correo queda en la capa de
interface (BackgroundTasks), y el token nunca cruza de vuelta al cliente.
"""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminResetEmailInfo, AdminSendResetEmailInput
from users.application.ports import AdminUserRepository
from users.domain.admin import parse_user_id


@dataclass(frozen=True, slots=True)
class AdminSendResetEmail:
    repo: AdminUserRepository

    def execute(self, data: AdminSendResetEmailInput) -> AdminResetEmailInfo:
        target_uuid = parse_user_id(data.user_id)
        self.repo.assert_can_touch_target(caller_id=data.caller_id, target_id=target_uuid)
        target = self.repo.get_target(target_uuid)

        token = self.repo.issue_reset_token(target_uuid)
        return AdminResetEmailInfo(email=target.email, full_name=target.full_name, token=token)
