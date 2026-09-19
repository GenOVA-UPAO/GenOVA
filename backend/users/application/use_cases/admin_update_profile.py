"""Caso de uso: actualizar el perfil de un usuario gestionado (admin)."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import AdminUpdateProfileInput
from users.application.ports import AdminUserRepository
from users.domain.admin import normalize_gender, normalize_phone, parse_user_id
from users.domain.errors import (
    EmailAlreadyInUse,
    PhoneNumberAlreadyInUse,
    UniversityIdAlreadyInUse,
)
from users.domain.profile import normalize_email, normalize_full_name

_MSG_EMAIL_IN_USE = "El correo electrónico ya está registrado por otro usuario."
_MSG_PHONE_IN_USE = "El número de teléfono ya está registrado por otro usuario."


@dataclass(frozen=True, slots=True)
class AdminUpdateProfile:
    repo: AdminUserRepository

    def execute(self, data: AdminUpdateProfileInput) -> None:
        target_uuid = parse_user_id(data.user_id)
        self.repo.assert_can_touch_target(caller_id=data.caller_id, target_id=target_uuid)
        self.repo.get_target(target_uuid)

        email = normalize_email(data.email)
        full_name = normalize_full_name(data.full_name)
        gender = normalize_gender(data.gender)
        phone = normalize_phone(data.phone_number)

        # Mismo orden de checks que el router original: correo, teléfono,
        # código universitario (cada dup excluye al usuario gestionado).
        if self.repo.email_in_use(email, excluding_user_id=target_uuid):
            raise EmailAlreadyInUse(_MSG_EMAIL_IN_USE)
        if phone and self.repo.phone_number_in_use(phone, excluding_user_id=target_uuid):
            raise PhoneNumberAlreadyInUse(_MSG_PHONE_IN_USE)
        if data.university_id and self.repo.university_id_in_use(
            data.university_id, excluding_user_id=target_uuid
        ):
            raise UniversityIdAlreadyInUse()

        self.repo.update_profile(
            target_uuid,
            full_name=full_name,
            email=email,
            university_id=data.university_id,
            gender=gender,
            phone_number=phone,
        )
