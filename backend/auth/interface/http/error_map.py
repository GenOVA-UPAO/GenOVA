"""Traduce los errores de dominio de autenticación al sobre JSON
``{"error", "message", ...}`` con su código HTTP. Mantiene byte a byte los
cuerpos que devolvían los routers antes de la extracción a casos de uso.
"""

from __future__ import annotations

from fastapi import status
from fastapi.responses import JSONResponse

from auth.domain.errors import (
    AccountLocked,
    AuthError,
    EmailNotVerified,
    InvalidCredentials,
    TooManyAttempts,
)


def auth_error_to_response(err: AuthError) -> JSONResponse:
    if isinstance(err, TooManyAttempts):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "too_many_attempts",
                "message": "Demasiados intentos para esta cuenta. Espera un minuto.",
            },
        )
    if isinstance(err, AccountLocked):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "account_locked",
                "message": "Cuenta bloqueada temporalmente. Intenta más tarde.",
                "retry_after_minutes": err.retry_after_minutes,
            },
        )
    if isinstance(err, EmailNotVerified):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "email_not_verified",
                "message": (
                    "Verifica tu correo para iniciar sesión. Revisa tu bandeja o "
                    "solicita un nuevo enlace."
                ),
            },
        )
    # InvalidCredentials y cualquier AuthError no específico: 401 genérico.
    assert isinstance(err, (InvalidCredentials, AuthError))
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
    )
