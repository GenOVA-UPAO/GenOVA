"""Adaptadores de salida del dominio de roles (SQLAlchemy)."""

from roles.infrastructure.orm import Role, UserRole
from roles.infrastructure.sqlalchemy_repository import SqlAlchemyRoleRepository

__all__ = ["Role", "SqlAlchemyRoleRepository", "UserRole"]
