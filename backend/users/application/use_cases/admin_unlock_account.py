"""Caso de uso: desbloquear un usuario gestionado (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminUnlockAccountInput
from users.application.ports import AdminUserRepository
from users.domain.admin import parse_user_id


@dataclass(frozen=True, slots=True)
class AdminUnlockAccount:
    repo: AdminUserRepository

    def execute(self, data: AdminUnlockAccountInput) -> str:
        target_uuid = parse_user_id(data.user_id)
        self.repo.assert_can_touch_target(caller_id=data.caller_id, target_id=target_uuid)
        self.repo.get_target(target_uuid)

        self.repo.unlock(target_uuid)
        return str(target_uuid)
