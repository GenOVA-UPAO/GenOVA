"""Caso de uso: presentar la identidad y acceso de la sesión actual."""

from __future__ import annotations

from dataclasses import dataclass

from auth.application.dto import SessionProfileResult
from auth.application.ports import SessionUserRepository
from auth.domain.user import AuthenticatedUser


@dataclass(frozen=True, slots=True)
class GetSessionProfile:
    users: SessionUserRepository

    def execute(self, user: AuthenticatedUser) -> SessionProfileResult:
        access = self.users.access_for(user.id)
        return SessionProfileResult(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            university_id=user.university_id,
            gender=user.gender or "",
            phone_number=user.phone_number or "",
            theme_settings=user.theme_settings,
            role=access.role,
            permissions=access.permissions,
            created_at=user.created_at.isoformat() if user.created_at else None,
            totp_enabled=user.totp_enabled,
        )
