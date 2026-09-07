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


class InvalidUserId(UserError):
    def __init__(self, detail: str = "Usuario no encontrado (ID inválido).") -> None:
        super().__init__(detail)


class UserNotFound(UserError):
    def __init__(self, detail: str = "Usuario no encontrado.") -> None:
        super().__init__(detail)


class AdminTargetProtected(UserError):
    def __init__(
        self,
        detail: str = "Acceso denegado: No puedes modificar a un usuario administrador.",
    ) -> None:
        super().__init__(detail)


class SelfRoleChangeForbidden(UserError):
    def __init__(
        self,
        detail: str = "No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo.",
    ) -> None:
        super().__init__(detail)


class SelfDeactivationForbidden(UserError):
    def __init__(self, detail: str = "No puedes desactivar tu propia cuenta.") -> None:
        super().__init__(detail)


class InvalidRoleId(UserError):
    def __init__(self, detail: str = "El ID de rol especificado es inválido.") -> None:
        super().__init__(detail)


class AdminRoleNotFound(UserError):
    def __init__(self, detail: str = "El rol especificado no existe.") -> None:
        super().__init__(detail)


class AdminRoleAssignmentForbidden(UserError):
    def __init__(
        self,
        detail: str = "Acceso denegado: No tienes permisos para asignar el rol de administrador.",
    ) -> None:
        super().__init__(detail)


class LinkNotFound(UserError):
    def __init__(self, detail: str = "Vinculo no encontrado.") -> None:
        super().__init__(detail)


class LinkNotPending(UserError):
    def __init__(
        self, detail: str = "Solo se pueden reenviar invitaciones pendientes."
    ) -> None:
        super().__init__(detail)


class SelfLinkForbidden(UserError):
    def __init__(self, detail: str = "No puedes vincularte contigo mismo.") -> None:
        super().__init__(detail)


class InvalidLinkCode(UserError):
    def __init__(self, detail: str = "Codigo invalido o expirado.") -> None:
        super().__init__(detail)


class InvalidApiKeyPayload(UserError):
    def __init__(self, detail: str = "Payload de claves de API inválido.") -> None:
        super().__init__(detail)


class ApiKeyTooShort(UserError):
    def __init__(self, detail: str = "La API key es demasiado corta.") -> None:
        super().__init__(detail)


class ApiKeysNotSaved(UserError):
    def __init__(
        self, detail: str = "No se pudo guardar las API keys. Intenta de nuevo."
    ) -> None:
        super().__init__(detail)
