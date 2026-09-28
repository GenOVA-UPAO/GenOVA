"""Entidad y reglas puras del perfil propio del usuario.

Las validaciones reproducen exactamente los checks que vivían en el router
de ajustes de perfil (mismo orden y mismos mensajes).
"""

from __future__ import annotations

from dataclasses import dataclass

from users.domain.errors import InvalidGender, InvalidPhoneNumber

VALID_GENDERS = ("masculino", "femenino", "otro")


@dataclass(frozen=True, slots=True)
class UserProfile:
    """Instantánea del perfil propio tras la persistencia."""

    id: str
    email: str
    full_name: str | None
    university_id: int | None
    gender: str | None
    phone_number: str | None
    theme_settings: dict | None
    created_at: str | None
    updated_at: str | None


def normalize_email(raw: str) -> str:
    return raw.strip().lower()


def normalize_full_name(raw: str) -> str:
    return raw.strip()


def normalize_phone_number(raw: str | None) -> str | None:
    return raw.strip() if raw else None


def normalize_gender(raw: str | None) -> str | None:
    return raw.strip().lower() if raw else None


def validate_gender(gender: str | None) -> None:
    if gender and gender not in VALID_GENDERS:
        raise InvalidGender()


def validate_phone_number(phone_number: str | None) -> None:
    if phone_number:
        cleaned = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        if not cleaned.isdigit():
            raise InvalidPhoneNumber()
