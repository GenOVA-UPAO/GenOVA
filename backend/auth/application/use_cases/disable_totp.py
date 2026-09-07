"""Caso de uso: desactivar el TOTP de la cuenta actual."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import DisableTotpInput
from auth.application.ports import TotpAuthenticator, TotpUserRepository
from auth.domain.errors import InvalidTotpCode, TotpNotEnabled


@dataclass(frozen=True, slots=True)
class DisableTotp:
    authenticator: TotpAuthenticator
    users: TotpUserRepository

    def execute(self, data: DisableTotpInput) -> None:
        if not data.user.totp_enabled or not data.user.totp_secret:
            raise TotpNotEnabled()
        if not self.authenticator.verify(data.user.totp_secret, data.code.strip()):
            raise InvalidTotpCode()
        self.users.disable(data.user.id)
