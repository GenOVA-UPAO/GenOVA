"""Caso de uso: solicitar un enlace de recuperación de contraseña."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from auth.application.dto import RequestPasswordResetInput
from auth.application.ports import EmailSender, PasswordResetTokenRepository, TokenGenerator
from auth.domain.email import normalize_email


@dataclass(frozen=True, slots=True)
class RequestPasswordReset:
    repo: PasswordResetTokenRepository
    tokens: TokenGenerator
    emails: EmailSender

    def execute(self, data: RequestPasswordResetInput) -> None:
        user = self.repo.find_active_user(normalize_email(data.email))
        if user is None:
            return

        token = self.tokens.generate()
        self.repo.replace_for_user(
            user.id,
            token,
            datetime.now(UTC) + timedelta(hours=1),
        )
        self.emails.send_password_reset(user, token)
