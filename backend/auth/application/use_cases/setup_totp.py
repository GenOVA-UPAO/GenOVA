"""Caso de uso: iniciar el enrolamiento TOTP."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import SetupTotpInput, SetupTotpResult
from auth.application.ports import TotpAuthenticator, TotpUserRepository
from auth.domain.errors import TotpAlreadyEnabled


@dataclass(frozen=True, slots=True)
class SetupTotp:
    authenticator: TotpAuthenticator
    users: TotpUserRepository

    def execute(self, data: SetupTotpInput) -> SetupTotpResult:
        if data.user.totp_enabled:
            raise TotpAlreadyEnabled()
        enrollment = self.authenticator.create_enrollment(data.user.email)
        self.users.save_setup(
            data.user.id,
            enrollment.secret,
            enrollment.hashed_backup_codes,
        )
        return SetupTotpResult(
            provisioning_uri=enrollment.provisioning_uri,
            secret=enrollment.secret,
            backup_codes=enrollment.backup_codes,
        )
