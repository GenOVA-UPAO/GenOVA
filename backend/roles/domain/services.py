"""Servicios de dominio: políticas puras del dominio de roles."""

from __future__ import annotations

SYSTEM_ROLE_NAMES: frozenset[str] = frozenset({"administrador", "usuario"})


def is_system_role(name: str) -> bool:
    """Los roles del sistema no se pueden editar ni eliminar."""
    return name.strip().lower() in SYSTEM_ROLE_NAMES


# El registro en modo tesis busca este rol por su nombre para asignarlo a las
# cuentas nuevas: renombrarlo dejaría el registro sin rol que asignar.
NAME_LOCKED_ROLES: frozenset[str] = frozenset({"usuarios_prueba"})


def is_name_locked(name: str) -> bool:
    """Roles editables cuyo nombre no puede cambiar."""
    return name.strip().lower() in NAME_LOCKED_ROLES
