"""Caso de uso: completar el login con TOTP o un código de respaldo."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import VerifyTotpLoginInput, VerifyTotpLoginResult
from auth.application.ports import (
    TotpAuthenticator,
    TotpLoginUserRepository,
    TotpTicketConsumer,
)
from auth.domain.errors import InvalidTotpCode, InvalidTotpTicket


@dataclass(frozen=True, slots=True)
class VerifyTotpLogin:
    tickets: TotpTicketConsumer
    users: TotpLoginUserRepository
    authenticator: TotpAuthenticator

    def execute(self, data: VerifyTotpLoginInput) -> VerifyTotpLoginResult:
        ticket = self.tickets.consume(data.ticket)
        if ticket is None:
            raise InvalidTotpTicket()

        user = self.users.find_by_id(ticket.user_id)
        if user is None or not user.totp_enabled or not user.totp_secret:
            raise InvalidTotpTicket()

        code = data.code.strip().replace(" ", "")
        if self.authenticator.verify(user.totp_secret, code):
            return VerifyTotpLoginResult(
                user_id=str(user.id),
                email=user.email,
                remember_me=ticket.remember_me,
            )

        backup_codes = user.backup_codes
        for entry in backup_codes:
            if not entry.get("used") and self.authenticator.verify_backup(code, entry["hash"]):
                entry["used"] = True
                self.users.save_backup_codes(user.id, backup_codes)
                return VerifyTotpLoginResult(
                    user_id=str(user.id),
                    email=user.email,
                    remember_me=ticket.remember_me,
                    backup_code_used=True,
                )

        raise InvalidTotpCode()
