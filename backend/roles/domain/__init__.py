"""Núcleo de dominio de roles. Sin dependencias de framework ni de otras capas."""

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
from roles.domain.model import Role, UserRoleLink
from roles.domain.services import SYSTEM_ROLE_NAMES, is_system_role
from roles.domain.value_objects import RoleName

__all__ = [
    "SYSTEM_ROLE_NAMES",
    "DuplicateRoleName",
    "InvalidReassignmentTarget",
    "InvalidRoleName",
    "ReassignmentRequired",
    "ReassignmentTargetNotFound",
    "Role",
    "RoleError",
    "RoleName",
    "RoleNotFound",
    "SystemRoleProtected",
    "UserRoleLink",
    "is_system_role",
]
