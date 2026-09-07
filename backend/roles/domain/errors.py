"""Errores del dominio de roles.

Son excepciones puras: no conocen HTTP. El adaptador `interface/http/error_map.py`
las traduce a `HTTPException`.
"""

from __future__ import annotations


class RoleError(Exception):
    """Raíz de todos los errores del dominio de roles."""


class RoleNotFound(RoleError):
    def __init__(self, detail: str = "Rol no encontrado.") -> None:
        super().__init__(detail)


class DuplicateRoleName(RoleError):
    def __init__(self, detail: str = "Ya existe un rol con ese nombre.") -> None:
        super().__init__(detail)


class InvalidRoleName(RoleError):
    def __init__(self, detail: str = "El nombre del rol no es válido.") -> None:
        super().__init__(detail)


class SystemRoleProtected(RoleError):
    def __init__(
        self,
        detail: str = "No se pueden modificar los roles del sistema (administrador, usuario).",
    ) -> None:
        super().__init__(detail)


class ReassignmentRequired(RoleError):
    def __init__(self, user_count: int) -> None:
        super().__init__(
            f"El rol tiene {user_count} usuario(s) asignado(s) y no se especificó "
            "un rol de reasignación."
        )
        self.user_count = user_count


class InvalidReassignmentTarget(RoleError):
    def __init__(
        self, detail: str = "No se puede reasignar al mismo rol que se está eliminando."
    ) -> None:
        super().__init__(detail)


class ReassignmentTargetNotFound(RoleError):
    def __init__(
        self, detail: str = "El rol de reasignación especificado no existe."
    ) -> None:
        super().__init__(detail)
