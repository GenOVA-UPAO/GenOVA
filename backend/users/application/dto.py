"""DTOs de entrada/salida de los casos de uso de usuarios (sin pydantic)."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class UpdateProfileInput:
    user_id: UUID
    full_name: str
    email: str
    university_id: int | None
    gender: str | None
    phone_number: str | None


@dataclass(frozen=True, slots=True)
class UpdateThemeInput:
    user_id: UUID
    color_mode: str
    design_mode: str
    palette: dict | None
