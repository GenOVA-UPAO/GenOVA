"""Composition root del dominio de roles.

Cablea los casos de uso con el repositorio concreto a través de la DI de FastAPI.
FastAPI es el contenedor: `Depends(build_roles)` en el router.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from roles.application.use_cases import CreateRole, DeleteRole, ListRoles, UpdateRole
from roles.infrastructure.sqlalchemy_repository import SqlAlchemyRoleRepository


@dataclass(frozen=True, slots=True)
class RolesUseCases:
    list_roles: ListRoles
    create_role: CreateRole
    update_role: UpdateRole
    delete_role: DeleteRole


def build_roles(db: Session = Depends(get_db)) -> RolesUseCases:
    repo = SqlAlchemyRoleRepository(db)
    return RolesUseCases(
        list_roles=ListRoles(repo),
        create_role=CreateRole(repo),
        update_role=UpdateRole(repo),
        delete_role=DeleteRole(repo),
    )
