"""Caso de uso: registrar una cuenta y preparar su verificación de correo."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from auth.application.dto import RegisterInput, RegisterResult
from auth.application.ports import (
    EmailSender,
    PasswordHasher,
    PasswordPolicy,
    RegistrationRepository,
    TokenGenerator,
)
from auth.domain.email import normalize_email
from auth.domain.errors import InvalidFullName, WeakRegistrationPassword


@dataclass(frozen=True, slots=True)
class RegisterUser:
    repo: RegistrationRepository
    passwords: PasswordHasher
    password_policy: PasswordPolicy
    tokens: TokenGenerator
    emails: EmailSender
    email_verification_enabled: bool

    def execute(self, data: RegisterInput) -> RegisterResult:
        if not self.password_policy.accepts(data.password):
            raise WeakRegistrationPassword()

        full_name = (data.full_name or "").strip()
        if full_name and not any(character.isalpha() for character in full_name):
            raise InvalidFullName()

        verification_token = None
        verification_expires_at = None
        if self.email_verification_enabled:
            verification_token = self.tokens.generate()
            verification_expires_at = datetime.now(UTC) + timedelta(hours=24)

        user = self.repo.create(
            email=data.email.strip().lower(),
            normalized_email=normalize_email(data.email),
            password_hash=self.passwords.hash(data.password),
            full_name=full_name or None,
            email_verified=not self.email_verification_enabled,
            verification_token=verification_token,
            verification_expires_at=verification_expires_at,
        )

        if verification_token is not None:
            self.emails.send_verification(user, verification_token)

        return RegisterResult(
            user_id=user.id,
            email=user.email,
            email_verification_required=self.email_verification_enabled,
        )
