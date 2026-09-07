"""Errores de dominio de usuarios.

Son excepciones puras: no conocen HTTP. El adaptador `interface/http/error_map.py`
las traduce a `HTTPException` con el mismo sobre que cada endpoint usa hoy.
"""

from __future__ import annotations


class UserError(Exception):
    """Raíz de todos los errores del dominio de usuarios."""


class InvalidGender(UserError):
    def __init__(
        self, detail: str = "El sexo especificado debe ser 'masculino', 'femenino' u 'otro'."
    ) -> None:
        super().__init__(detail)


class InvalidPhoneNumber(UserError):
    def __init__(
        self,
        detail: str = "El número de teléfono solo debe contener dígitos y opcionalmente el signo '+'.",
    ) -> None:
        super().__init__(detail)


class EmailAlreadyInUse(UserError):
    def __init__(
        self, detail: str = "El correo electrónico ya está en uso por otro usuario."
    ) -> None:
        super().__init__(detail)


class PhoneNumberAlreadyInUse(UserError):
    def __init__(
        self, detail: str = "El número de teléfono ya está en uso por otro usuario."
    ) -> None:
        super().__init__(detail)


class UniversityIdAlreadyInUse(UserError):
    def __init__(
        self, detail: str = "El código universitario ya está registrado por otro usuario."
    ) -> None:
        super().__init__(detail)


class PasswordConfirmationMismatch(UserError):
    def __init__(
        self, detail: str = "La nueva contraseña y su confirmación no coinciden."
    ) -> None:
        super().__init__(detail)


class WeakNewPassword(UserError):
    def __init__(
        self,
        detail: str = "La nueva contraseña debe tener al menos 8 caracteres y contener letras y números.",
    ) -> None:
        super().__init__(detail)


class IncorrectCurrentPassword(UserError):
    def __init__(self, detail: str = "La contraseña actual ingresada es incorrecta.") -> None:
        super().__init__(detail)


class IncorrectAccountPassword(UserError):
    def __init__(self, detail: str = "Contraseña incorrecta") -> None:
        super().__init__(detail)


class SoleAdminRemoval(UserError):
    def __init__(
        self,
        detail: str = "No puedes eliminar tu cuenta porque eres el único administrador activo.",
    ) -> None:
        super().__init__(detail)


class InvalidResourceConfigs(UserError):
    def __init__(self, detail: str = "Configuración de recursos inválida.") -> None:
        super().__init__(detail)


class ResourceConfigsNotSaved(UserError):
    def __init__(
        self, detail: str = "No se pudo guardar la configuración. Intenta de nuevo."
    ) -> None:
        super().__init__(detail)
