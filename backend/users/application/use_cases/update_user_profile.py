"""Caso de uso: actualizar el perfil propio."""

from __future__ import annotations

from dataclasses import dataclass

from users.application.dto import UpdateProfileInput
from users.application.ports import UserProfileRepository
from users.domain.errors import (
    EmailAlreadyInUse,
    PhoneNumberAlreadyInUse,
    UniversityIdAlreadyInUse,
)
from users.domain.profile import (
    UserProfile,
    normalize_email,
    normalize_full_name,
    normalize_gender,
    normalize_phone_number,
    validate_gender,
    validate_phone_number,
)


@dataclass(frozen=True, slots=True)
class UpdateUserProfile:
    repo: UserProfileRepository

    def execute(self, data: UpdateProfileInput) -> UserProfile:
        email = normalize_email(data.email)
        full_name = normalize_full_name(data.full_name)
        phone_number = normalize_phone_number(data.phone_number)
        gender = normalize_gender(data.gender)

        validate_gender(gender)
        validate_phone_number(phone_number)

        # Mismo orden de checks que el router original: correo, teléfono,
        # código universitario (cada dup excluye al propio usuario).
        if self.repo.email_in_use(email, excluding_user_id=data.user_id):
            raise EmailAlreadyInUse()
        if phone_number and self.repo.phone_number_in_use(
            phone_number, excluding_user_id=data.user_id
        ):
            raise PhoneNumberAlreadyInUse()
        if data.university_id and self.repo.university_id_in_use(
            data.university_id, excluding_user_id=data.user_id
        ):
            raise UniversityIdAlreadyInUse()

        return self.repo.save_profile(
            data.user_id,
            full_name=full_name,
            email=email,
            university_id=data.university_id,
            gender=gender,
            phone_number=phone_number,
        )
