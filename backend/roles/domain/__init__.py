"""Núcleo de dominio de roles. Sin dependencias de framework ni de otras capas."""

from roles.domain.errors import (
    DuplicateRoleName,
    InvalidReassignmentTarget,
    InvalidRoleName,
    ReassignmentRequired,
    ReassignmentTargetNotFound,
    RoleError,
    RoleNameLocked,
    RoleNotFound,
    SystemRoleProtected,
)
from roles.domain.model import Role, UserRoleLink
from roles.domain.services import (
    NAME_LOCKED_ROLES,
    SYSTEM_ROLE_NAMES,
    is_name_locked,
    is_system_role,
)
from roles.domain.value_objects import RoleName

__all__ = [
    "NAME_LOCKED_ROLES",
    "SYSTEM_ROLE_NAMES",
    "DuplicateRoleName",
    "InvalidReassignmentTarget",
    "InvalidRoleName",
    "ReassignmentRequired",
    "ReassignmentTargetNotFound",
    "Role",
    "RoleError",
    "RoleName",
    "RoleNameLocked",
    "RoleNotFound",
    "SystemRoleProtected",
    "UserRoleLink",
    "is_name_locked",
    "is_system_role",
]
