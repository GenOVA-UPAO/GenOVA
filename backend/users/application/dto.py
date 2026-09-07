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


@dataclass(frozen=True, slots=True)
class ChangePasswordInput:
    user_id: UUID
    current_password: str
    new_password: str
    confirm_password: str


@dataclass(frozen=True, slots=True)
class DeleteAccountInput:
    user_id: UUID
    password: str


@dataclass(frozen=True, slots=True)
class SaveResourceConfigsInput:
    user_id: UUID
    configs: dict
