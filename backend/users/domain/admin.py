"""Entidades y reglas puras del cluster de administración de usuarios."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AdminRoleSummary:
    id: str
    name: str


@dataclass(frozen=True, slots=True)
class AdminUserSummary:
    """Instantánea de un usuario para el listado administrativo."""

    id: str
    email: str
    full_name: str | None
    university_id: int | None
    gender: str | None
    phone_number: str | None
    is_active: bool
    failed_login_attempts: int
    locked_until: str | None
    role: AdminRoleSummary | None
    created_at: str | None
