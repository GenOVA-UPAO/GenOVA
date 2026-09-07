"""Caso de uso: sustituir la contraseña mediante un token de recuperación."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from auth.application.dto import ResetPasswordInput
from auth.application.ports import PasswordHasher, PasswordPolicy, PasswordResetTokenRepository
from auth.domain.errors import (
    ExpiredPasswordResetToken,
    InvalidPasswordResetToken,
    PasswordResetUserNotFound,
    WeakResetPassword,
)


@dataclass(frozen=True, slots=True)
class ResetPassword:
    repo: PasswordResetTokenRepository
    passwords: PasswordHasher
    password_policy: PasswordPolicy

    def execute(self, data: ResetPasswordInput) -> None:
        if not self.password_policy.accepts(data.new_password):
            raise WeakResetPassword()

        token = data.token.strip()
        record = self.repo.find_by_token(token)
        if record is None:
            raise InvalidPasswordResetToken()

        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < datetime.now(UTC):
            self.repo.delete(token)
            raise ExpiredPasswordResetToken()

        if not self.repo.find_user(record.user_id):
            raise PasswordResetUserNotFound()
        self.repo.apply_new_password(record.user_id, self.passwords.hash(data.new_password))
