"""Implementación SQLAlchemy del puerto RoleRepository."""

from __future__ import annotations

from uuid import UUID

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from roles.domain.model import Role
from roles.infrastructure.mappers import to_domain
from roles.infrastructure.orm import Role as RoleORM
from roles.infrastructure.orm import UserRole as UserRoleORM

logger = structlog.get_logger(__name__)


class SqlAlchemyRoleRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_with_user_counts(self) -> list[tuple[Role, int]]:
        stmt = (
            select(RoleORM, func.count(UserRoleORM.user_id).label("user_count"))
            .outerjoin(UserRoleORM, UserRoleORM.role_id == RoleORM.id)
            .group_by(RoleORM.id)
        )
        return [(to_domain(row), count or 0) for row, count in self._db.execute(stmt).all()]

    def get(self, role_id: UUID) -> Role | None:
        orm = self._db.execute(
            select(RoleORM).where(RoleORM.id == role_id)
        ).scalar_one_or_none()
        return to_domain(orm) if orm else None

    def get_by_name(self, name: str) -> Role | None:
        orm = self._db.execute(
            select(RoleORM).where(RoleORM.name == name)
        ).scalar_one_or_none()
        return to_domain(orm) if orm else None

    def add(self, name: str, description: str, permissions: list[str]) -> Role:
        orm = RoleORM(name=name, description=description, permissions=permissions)
        self._db.add(orm)
        commit_or_500(self._db, "create_role")
        self._db.refresh(orm)
        return to_domain(orm)

    def update(
        self,
        role_id: UUID,
        *,
        name: str | None = None,
        description: str | None = None,
        permissions: list[str] | None = None,
    ) -> Role:
        orm = self._require_orm(role_id)
        if name is not None:
            orm.name = name
        if description is not None:
            orm.description = description
        if permissions is not None:
            orm.permissions = permissions
        commit_or_500(self._db, "update_role")
        self._db.refresh(orm)
        return to_domain(orm)

    def count_users(self, role_id: UUID) -> int:
        return (
            self._db.execute(
                select(func.count(UserRoleORM.user_id)).where(UserRoleORM.role_id == role_id)
            ).scalar()
            or 0
        )

    def reassign_users(self, from_role_id: UUID, to_role_id: UUID) -> None:
        try:
            links = (
                self._db.execute(
                    select(UserRoleORM).where(UserRoleORM.role_id == from_role_id)
                )
                .scalars()
                .all()
            )
            for link in links:
                already = self._db.execute(
                    select(UserRoleORM).where(
                        UserRoleORM.user_id == link.user_id,
                        UserRoleORM.role_id == to_role_id,
                    )
                ).scalar_one_or_none()
                user_id = link.user_id
                self._db.delete(link)
                self._db.flush()
                if already is None:
                    self._db.add(UserRoleORM(user_id=user_id, role_id=to_role_id))
            self._db.flush()
        except Exception:
            self._db.rollback()
            logger.exception("reassignment failed during delete_role")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo reasignar a los usuarios. Intenta de nuevo.",
            ) from None

    def delete(self, role_id: UUID) -> None:
        orm = self._require_orm(role_id)
        self._db.delete(orm)
        commit_or_500(self._db, "delete_role")

    def _require_orm(self, role_id: UUID) -> RoleORM:
        orm = self._db.execute(
            select(RoleORM).where(RoleORM.id == role_id)
        ).scalar_one_or_none()
        if orm is None:
            # No debería ocurrir: el caso de uso ya validó existencia.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado.")
        return orm
