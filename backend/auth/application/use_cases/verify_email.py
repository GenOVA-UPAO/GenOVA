"""Caso de uso: verificar el correo mediante un token de un solo uso."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from auth.application.dto import VerifyEmailInput, VerifyEmailResult
from auth.application.ports import EmailVerificationTokenRepository
from auth.domain.errors import (
    EmailVerificationUserNotFound,
    ExpiredEmailVerificationToken,
    InvalidEmailVerificationToken,
)


@dataclass(frozen=True, slots=True)
class VerifyEmail:
    repo: EmailVerificationTokenRepository

    def execute(self, data: VerifyEmailInput) -> VerifyEmailResult:
        token = data.token.strip()
        record = self.repo.find_by_token(token)
        if record is None:
            raise InvalidEmailVerificationToken()

        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            self.repo.delete(token)
            raise ExpiredEmailVerificationToken()

        user = self.repo.find_user(record.user_id)
        if user is None:
            self.repo.delete(token)
            raise EmailVerificationUserNotFound()

        self.repo.mark_verified(user.id)
        return VerifyEmailResult(user_id=str(user.id), email=user.email)
