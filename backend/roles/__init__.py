"""Dominio de roles (arquitectura hexagonal).

API pública para otros dominios: entidades y errores de `roles.domain`.
El router HTTP se importa desde `roles.interface.http.router`; los modelos ORM
desde `roles.infrastructure.orm` (registro de metadata en `models.py`).
"""

from roles.domain import (  # noqa: F401
    Role,
    RoleError,
    RoleName,
    UserRoleLink,
    is_system_role,
)

__all__ = ["Role", "RoleError", "RoleName", "UserRoleLink", "is_system_role"]
