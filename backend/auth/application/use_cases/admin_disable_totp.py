"""Caso de uso: desactivar el TOTP de una cuenta como administrador."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import AdminDisableTotpInput
from auth.application.ports import TotpAdminRepository
from auth.domain.errors import TotpAdminUserNotFound


@dataclass(frozen=True, slots=True)
class AdminDisableTotp:
    users: TotpAdminRepository

    def execute(self, data: AdminDisableTotpInput) -> None:
        if not self.users.disable_by_id(data.user_id):
            raise TotpAdminUserNotFound()
