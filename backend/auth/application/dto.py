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
