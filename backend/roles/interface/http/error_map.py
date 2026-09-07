"""Traducción de errores de dominio de roles a HTTPException."""

from __future__ import annotations

from fastapi import HTTPException, status

from roles.domain.errors import (
    DuplicateRoleName,
    InvalidReassignmentTarget,
    InvalidRoleName,
    ReassignmentRequired,
    ReassignmentTargetNotFound,
    RoleError,
    RoleNotFound,
    SystemRoleProtected,
)

_STATUS_BY_ERROR: dict[type[RoleError], int] = {
    RoleNotFound: status.HTTP_404_NOT_FOUND,
    ReassignmentTargetNotFound: status.HTTP_404_NOT_FOUND,
    SystemRoleProtected: status.HTTP_403_FORBIDDEN,
    DuplicateRoleName: status.HTTP_409_CONFLICT,
    ReassignmentRequired: status.HTTP_409_CONFLICT,
    InvalidRoleName: status.HTTP_400_BAD_REQUEST,
    InvalidReassignmentTarget: status.HTTP_400_BAD_REQUEST,
}


def to_http_exception(err: RoleError) -> HTTPException:
    code = _STATUS_BY_ERROR.get(type(err), status.HTTP_400_BAD_REQUEST)
    return HTTPException(status_code=code, detail=str(err))
