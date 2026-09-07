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
    EmailAlreadyRegistered,
    EmailNotVerified,
    EmailVerificationUserNotFound,
    ExpiredEmailVerificationToken,
    ExpiredPasswordResetToken,
    InvalidCredentials,
    InvalidEmailVerificationToken,
    InvalidFullName,
    InvalidPasswordResetToken,
    PasswordResetUserNotFound,
    TooManyAttempts,
    WeakRegistrationPassword,
    WeakResetPassword,
)

_ERROR_RESPONSES: dict[type[AuthError], tuple[int, dict[str, object]]] = {
    InvalidEmailVerificationToken: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "invalid_token",
            "message": "El enlace de verificación es inválido o ya fue usado.",
        },
    ),
    ExpiredEmailVerificationToken: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "expired_token",
            "message": "El enlace de verificación ha expirado. Solicita uno nuevo.",
        },
    ),
    EmailVerificationUserNotFound: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "user_not_found",
            "message": "La cuenta asociada ya no existe.",
        },
    ),
    WeakResetPassword: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "weak_password",
            "message": (
                "La nueva contraseña debe tener al menos 8 caracteres y contener letras y números."
            ),
        },
    ),
    InvalidPasswordResetToken: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "invalid_token",
            "message": "El token de restablecimiento es inválido o ya ha sido utilizado.",
        },
    ),
    ExpiredPasswordResetToken: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "expired_token",
            "message": "El token de restablecimiento ha expirado.",
        },
    ),
    PasswordResetUserNotFound: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "user_not_found",
            "message": "El usuario asociado a este token no existe.",
        },
    ),
    WeakRegistrationPassword: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "weak_password",
            "message": "La contraseña debe tener al menos 8 caracteres con letras y números.",
        },
    ),
    InvalidFullName: (
        status.HTTP_400_BAD_REQUEST,
        {
            "error": "invalid_name",
            "message": "El nombre debe contener al menos una letra.",
        },
    ),
    EmailAlreadyRegistered: (
        status.HTTP_400_BAD_REQUEST,
        {"error": "email_exists", "message": "El correo ya está registrado."},
    ),
    TooManyAttempts: (
        status.HTTP_429_TOO_MANY_REQUESTS,
        {
            "error": "too_many_attempts",
            "message": "Demasiados intentos para esta cuenta. Espera un minuto.",
        },
    ),
    EmailNotVerified: (
        status.HTTP_403_FORBIDDEN,
        {
            "error": "email_not_verified",
            "message": (
                "Verifica tu correo para iniciar sesión. Revisa tu bandeja o "
                "solicita un nuevo enlace."
            ),
        },
    ),
    InvalidCredentials: (
        status.HTTP_401_UNAUTHORIZED,
        {"error": "invalid_credentials", "message": "Credenciales inválidas."},
    ),
}


def auth_error_to_response(err: AuthError) -> JSONResponse:
    if isinstance(err, AccountLocked):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "account_locked",
                "message": "Cuenta bloqueada temporalmente. Intenta más tarde.",
                "retry_after_minutes": err.retry_after_minutes,
            },
        )
    status_code, content = _ERROR_RESPONSES.get(
        type(err),
        (
            status.HTTP_401_UNAUTHORIZED,
            {"error": "invalid_credentials", "message": "Credenciales inválidas."},
        ),
    )
    return JSONResponse(status_code=status_code, content=content)
