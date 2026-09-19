"""Caso de uso: reenviar el enlace de verificación sin revelar cuentas."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from auth.application.dto import ResendVerificationInput
from auth.application.ports import (
    EmailSender,
    EmailVerificationTokenRepository,
    TokenGenerator,
)
from auth.domain.email import normalize_email


@dataclass(frozen=True, slots=True)
class ResendVerification:
    repo: EmailVerificationTokenRepository
    tokens: TokenGenerator
    emails: EmailSender

    def execute(self, data: ResendVerificationInput) -> None:
        user = self.repo.find_user_by_normalized_email(normalize_email(data.email))
        if user is None or user.email_verified:
            return

        token = self.tokens.generate()
        self.repo.replace_for_user(
            user.id,
            token,
            datetime.now(UTC) + timedelta(hours=24),
        )
        self.emails.send_verification(user, token)
