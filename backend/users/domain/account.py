"""Entidad de la cuenta propia (seguridad: contraseña y baja)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class UserAccount:
    """Instantánea de credenciales para verificar la identidad del dueño."""

    id: str
    password_hash: str
