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
