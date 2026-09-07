"""Traducción de errores de dominio de usuarios a HTTPException.

Los endpoints de ajustes usan `HTTPException(detail=...)`: el sobre JSON
resultante es el que FastAPI genera (`{"detail": ...}`), idéntico al de hoy.
"""

from __future__ import annotations

from fastapi import HTTPException, status

from users.domain.errors import (
    AdminRoleAssignmentForbidden,
    AdminRoleNotFound,
    AdminTargetProtected,
    EmailAlreadyInUse,
    IncorrectAccountPassword,
    IncorrectCurrentPassword,
    InvalidGender,
    InvalidPhoneNumber,
    InvalidResourceConfigs,
    InvalidRoleId,
    InvalidUserId,
    PasswordConfirmationMismatch,
    PhoneNumberAlreadyInUse,
    ResourceConfigsNotSaved,
    SelfDeactivationForbidden,
    SelfRoleChangeForbidden,
    SoleAdminRemoval,
    UniversityIdAlreadyInUse,
    UserError,
    UserNotFound,
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
    InvalidResourceConfigs: status.HTTP_400_BAD_REQUEST,
    ResourceConfigsNotSaved: status.HTTP_500_INTERNAL_SERVER_ERROR,
    InvalidUserId: status.HTTP_404_NOT_FOUND,
    UserNotFound: status.HTTP_404_NOT_FOUND,
    AdminTargetProtected: status.HTTP_403_FORBIDDEN,
    SelfRoleChangeForbidden: status.HTTP_400_BAD_REQUEST,
    SelfDeactivationForbidden: status.HTTP_400_BAD_REQUEST,
    InvalidRoleId: status.HTTP_400_BAD_REQUEST,
    AdminRoleNotFound: status.HTTP_404_NOT_FOUND,
    AdminRoleAssignmentForbidden: status.HTTP_403_FORBIDDEN,
}


def to_http_exception(err: UserError) -> HTTPException:
    code = _STATUS_BY_ERROR.get(type(err), status.HTTP_400_BAD_REQUEST)
    return HTTPException(status_code=code, detail=str(err))
