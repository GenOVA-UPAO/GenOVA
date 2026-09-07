"""Errores de dominio del flujo de autenticación.

Son señales puras (sin FastAPI): la capa de interface las traduce al sobre
JSON ``{"error", "message", ...}`` con su código HTTP en ``error_map``.
"""

from __future__ import annotations


class AuthError(Exception):
    """Base de todos los errores de autenticación."""


class InvalidCredentials(AuthError):
    """Email inexistente o contraseña incorrecta (mismo mensaje: no filtra cuál)."""


class TooManyAttempts(AuthError):
    """El throttle por-email superó el límite dentro de la ventana."""


class AccountLocked(AuthError):
    """La cuenta está bloqueada temporalmente tras acumular fallos."""

    def __init__(self, retry_after_minutes: int) -> None:
        self.retry_after_minutes = retry_after_minutes
        super().__init__("account locked")


class EmailNotVerified(AuthError):
    """El correo aún no está verificado y la verificación es obligatoria."""


class WeakRegistrationPassword(AuthError):
    """La contraseña de registro no cumple la política de complejidad."""


class InvalidFullName(AuthError):
    """El nombre de registro no contiene ninguna letra."""


class EmailAlreadyRegistered(AuthError):
    """La clave canónica del correo ya pertenece a otra cuenta."""


class WeakResetPassword(AuthError):
    """La nueva contraseña no cumple la política de complejidad."""


class InvalidPasswordResetToken(AuthError):
    """El token de recuperación no existe o ya fue utilizado."""


class ExpiredPasswordResetToken(AuthError):
    """El token de recuperación superó su fecha de expiración."""


class PasswordResetUserNotFound(AuthError):
    """La cuenta asociada al token de recuperación ya no existe."""
