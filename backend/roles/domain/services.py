"""Servicios de dominio: políticas puras del dominio de roles."""

from __future__ import annotations

SYSTEM_ROLE_NAMES: frozenset[str] = frozenset({"administrador", "usuario"})


def is_system_role(name: str) -> bool:
    """Los roles del sistema no se pueden editar ni eliminar."""
    return name.strip().lower() in SYSTEM_ROLE_NAMES
