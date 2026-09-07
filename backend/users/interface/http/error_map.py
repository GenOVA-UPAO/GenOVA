"""Traducción de errores de dominio de usuarios a HTTPException.

Los endpoints de ajustes usan `HTTPException(detail=...)`: el sobre JSON
resultante es el que FastAPI genera (`{"detail": ...}`), idéntico al de hoy.
"""

from __future__ import annotations

from fastapi import HTTPException, status

from users.domain.errors import (
    EmailAlreadyInUse,
    IncorrectAccountPassword,
    IncorrectCurrentPassword,
    InvalidGender,
    InvalidPhoneNumber,
    PasswordConfirmationMismatch,
    PhoneNumberAlreadyInUse,
    SoleAdminRemoval,
    UniversityIdAlreadyInUse,
    UserError,
    WeakNewPassword,
)

_STATUS_BY_ERROR: dict[type[UserError], int] = {
    InvalidGender: status.HTTP_400_BAD_REQUEST,
    InvalidPhoneNumber: status.HTTP_400_BAD_REQUEST,
    EmailAlreadyInUse: status.HTTP_400_BAD_REQUEST,
    PhoneNumberAlreadyInUse: status.HTTP_400_BAD_REQUEST,
    UniversityIdAlreadyInUse: status.HTTP_400_BAD_REQUEST,
    PasswordConfirmationMismatch: status.HTTP_400_BAD_REQUEST,
    WeakNewPassword: status.HTTP_400_BAD_REQUEST,
    IncorrectCurrentPassword: status.HTTP_400_BAD_REQUEST,
    IncorrectAccountPassword: status.HTTP_400_BAD_REQUEST,
    SoleAdminRemoval: status.HTTP_403_FORBIDDEN,
}


def to_http_exception(err: UserError) -> HTTPException:
    code = _STATUS_BY_ERROR.get(type(err), status.HTTP_400_BAD_REQUEST)
    return HTTPException(status_code=code, detail=str(err))
