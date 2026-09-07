"""Caso de uso: iniciar sesión con email + contraseña.

Preserva el orden de comprobaciones del router original (throttle -> lookup ->
bloqueo -> contraseña -> verificación de correo) y la optimización RN-001: el
único COMMIT en la ruta feliz solo ocurre si los contadores venían sucios.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from auth.application.dto import LoginInput, LoginResult
from auth.application.ports import (
    AuthUserRepository,
    LoginThrottle,
    PasswordVerifier,
    TotpTicketIssuer,
)
from auth.domain.email import normalize_email
from auth.domain.errors import (
    AccountLocked,
    EmailNotVerified,
    InvalidCredentials,
    TooManyAttempts,
)
from auth.domain.lockout import is_locked, minutes_remaining, next_failure_state


@dataclass(frozen=True, slots=True)
class LoginUser:
    repo: AuthUserRepository
    passwords: PasswordVerifier
    throttle: LoginThrottle
    tickets: TotpTicketIssuer
    rate_limit_enabled: bool
    email_verification_enabled: bool

    def execute(self, data: LoginInput) -> LoginResult:
        email = normalize_email(data.email)

        # El throttle por-email también es rate limit: respeta RATE_LIMIT_ENABLED=0
        # (CI/e2e/carga hacen decenas de logins seguidos con las cuentas seed).
        if self.rate_limit_enabled and self.throttle.is_throttled(email):
            raise TooManyAttempts()

        user = self.repo.find_by_normalized_email(email)
        if user is None:
            self.passwords.verify_dummy()
            raise InvalidCredentials()

        now = datetime.now(UTC)
        if is_locked(user.locked_until, now):
            assert user.locked_until is not None
            raise AccountLocked(minutes_remaining(user.locked_until, now))

        if not self.passwords.verify(data.password, user.password_hash):
            attempts, locked_until = next_failure_state(user.failed_login_attempts, now)
            self.repo.record_failed_attempt(user.id, attempts, locked_until)
            raise InvalidCredentials()

        if self.email_verification_enabled and not user.email_verified:
            raise EmailNotVerified()

        # RN-001: en la ruta feliz habitual ambos contadores ya están limpios y
        # este COMMIT era un round-trip a Supabase que no cambiaba nada.
        if user.failed_login_attempts or user.locked_until is not None:
            self.repo.reset_counters(user.id)

        if user.totp_enabled:
            ticket = self.tickets.issue(user.id, remember_me=data.remember_me)
            return LoginResult(
                user_id=user.id,
                email=user.email,
                remember_me=data.remember_me,
                totp_required=True,
                totp_ticket=ticket,
            )

        return LoginResult(user_id=user.id, email=user.email, remember_me=data.remember_me)
