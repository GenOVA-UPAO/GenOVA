"""Caso de uso: confirmar el primer código del enrolamiento TOTP."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import ConfirmTotpInput
from auth.application.ports import TotpAuthenticator, TotpUserRepository
from auth.domain.errors import InvalidTotpCode, TotpAlreadyEnabled, TotpNotSetup


@dataclass(frozen=True, slots=True)
class ConfirmTotp:
    authenticator: TotpAuthenticator
    users: TotpUserRepository

    def execute(self, data: ConfirmTotpInput) -> None:
        if not data.user.totp_secret:
            raise TotpNotSetup()
        if data.user.totp_enabled:
            raise TotpAlreadyEnabled()
        if not self.authenticator.verify(data.user.totp_secret, data.code.strip()):
            raise InvalidTotpCode()
        self.users.enable(data.user.id)
