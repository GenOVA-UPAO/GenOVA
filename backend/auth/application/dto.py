"""DTOs de entrada/salida de los casos de uso de autenticación."""

from __future__ import annotations

from dataclasses import dataclass

from auth.domain.user import AuthenticatedUser


@dataclass(frozen=True, slots=True)
class LoginInput:
    email: str
    password: str
    remember_me: bool = False


@dataclass(frozen=True, slots=True)
class LoginResult:
    """Resultado de un login correcto.

    Dos formas: sesión emitida (``totp_required=False``) o segundo factor
    pendiente (``totp_required=True`` con ``totp_ticket``).
    """

    user_id: str
    email: str
    remember_me: bool
    totp_required: bool = False
    totp_ticket: str | None = None


@dataclass(frozen=True, slots=True)
class RegisterInput:
    email: str
    password: str
    full_name: str | None = None


@dataclass(frozen=True, slots=True)
class RegisterResult:
    user_id: str
    email: str
    email_verification_required: bool


@dataclass(frozen=True, slots=True)
class RequestPasswordResetInput:
    email: str


@dataclass(frozen=True, slots=True)
class ResetPasswordInput:
    token: str
    new_password: str


@dataclass(frozen=True, slots=True)
class VerifyEmailInput:
    token: str


@dataclass(frozen=True, slots=True)
class VerifyEmailResult:
    user_id: str
    email: str


@dataclass(frozen=True, slots=True)
class ResendVerificationInput:
    email: str


@dataclass(frozen=True, slots=True)
class SessionProfileResult:
    id: str
    email: str
    full_name: str | None
    university_id: int | None
    gender: str
    phone_number: str
    theme_settings: dict[str, object]
    role: str | None
    permissions: tuple[str, ...]
    created_at: str | None
    totp_enabled: bool


@dataclass(frozen=True, slots=True)
class SetupTotpInput:
    user: AuthenticatedUser


@dataclass(frozen=True, slots=True)
class SetupTotpResult:
    provisioning_uri: str
    secret: str
    backup_codes: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ConfirmTotpInput:
    user: AuthenticatedUser
    code: str


@dataclass(frozen=True, slots=True)
class DisableTotpInput:
    user: AuthenticatedUser
    code: str


@dataclass(frozen=True, slots=True)
class VerifyTotpLoginInput:
    ticket: str
    code: str


@dataclass(frozen=True, slots=True)
class VerifyTotpLoginResult:
    user_id: str
    email: str
    remember_me: bool
    backup_code_used: bool = False


@dataclass(frozen=True, slots=True)
class AdminDisableTotpInput:
    user_id: str
