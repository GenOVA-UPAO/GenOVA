"""Adaptador HTTP (driving) del dominio de roles.

Único módulo del paquete que conoce FastAPI. Traduce request -> caso de uso ->
error de dominio -> HTTPException -> JSON.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from auth.dependencies import require_admin
from roles.application.dto import (
    CreateRoleInput,
    DeleteRoleInput,
    RoleView,
    UpdateRoleInput,
)
from roles.container import RolesUseCases, build_roles
from roles.domain.errors import RoleError
from roles.interface.http.error_map import to_http_exception
from roles.interface.http.schemas import RoleCreateRequest, RoleUpdateRequest

router = APIRouter(tags=["Admin · Roles"])


def _role_dict(view: RoleView, *, with_count: bool) -> dict:
    data = {
        "id": view.id,
        "name": view.name,
        "description": view.description,
        "permissions": view.permissions,
        "created_at": view.created_at,
    }
    if with_count:
        data["user_count"] = view.user_count or 0
    return data


def _parse_role_id(raw: str) -> UUID:
    try:
        return UUID(raw)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado (ID inválido).",
        ) from None


def _parse_reassign_id(raw: str | None) -> UUID | None:
    if raw is None:
        return None
    try:
        return UUID(raw)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID de reasignación es inválido.",
        ) from None


@router.get("", summary="Listar los roles")
def get_roles(
    _admin=Depends(require_admin),
    uc: RolesUseCases = Depends(build_roles),
):
    return [_role_dict(v, with_count=True) for v in uc.list_roles.execute()]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Crear un rol")
def create_role(
    payload: RoleCreateRequest,
    _admin=Depends(require_admin),
    uc: RolesUseCases = Depends(build_roles),
):
    try:
        view = uc.create_role.execute(
            CreateRoleInput(
                name=payload.name,
                description=payload.description,
                permissions=payload.permissions,
            )
        )
    except RoleError as err:
        raise to_http_exception(err) from None
    return _role_dict(view, with_count=False)


@router.patch("/{id}", summary="Actualizar un rol")
def update_role(
    id: str,
    payload: RoleUpdateRequest,
    _admin=Depends(require_admin),
    uc: RolesUseCases = Depends(build_roles),
):
    role_id = _parse_role_id(id)
    try:
        view = uc.update_role.execute(
            UpdateRoleInput(
                role_id=role_id,
                name=payload.name,
                description=payload.description,
                permissions=payload.permissions,
            )
        )
    except RoleError as err:
        raise to_http_exception(err) from None
    return _role_dict(view, with_count=False)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Eliminar un rol")
def delete_role(
    id: str,
    reassign_to_id: str | None = None,
    _admin=Depends(require_admin),
    uc: RolesUseCases = Depends(build_roles),
):
    role_id = _parse_role_id(id)
    target_id = _parse_reassign_id(reassign_to_id)
    try:
        uc.delete_role.execute(DeleteRoleInput(role_id=role_id, reassign_to_id=target_id))
    except RoleError as err:
        raise to_http_exception(err) from None
    return None
