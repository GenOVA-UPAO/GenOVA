"""DTOs de entrada/salida de los casos de uso de autenticación."""

from __future__ import annotations

from dataclasses import dataclass


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
