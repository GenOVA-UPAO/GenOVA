"""Modelos ORM del dominio de roles (SQLAlchemy).

Único sitio del paquete `roles` que conoce SQLAlchemy. Los nombres de clase
(`Role`, `UserRole`) se conservan porque el registro de SQLAlchemy y los
`relationship("Role" | "UserRole", ...)` de otros dominios los resuelven por
nombre.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class Role(Base):
    __tablename__ = "roles"

    id = _pk_column()
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    permissions = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))

    users = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), primary_key=True)
    is_primary = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")
