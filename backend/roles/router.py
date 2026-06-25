from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from core.database import commit_or_500, get_db
from models import Role, UserRole
from roles.delete_router import router as delete_router

router = APIRouter()


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=64, min_length=1)
    description: str = Field(default="")
    permissions: list[str] = Field(default_factory=list)


@router.get("")
def get_roles(current_user=Depends(require_admin), db: Session = Depends(get_db)):
    # Single JOIN query replaces N+1 COUNT queries — avoids Supabase latency
    # accumulation when the roles table grows over multiple CI runs.
    stmt = (
        select(Role, func.count(UserRole.user_id).label("user_count"))
        .outerjoin(UserRole, UserRole.role_id == Role.id)
        .group_by(Role.id)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "description": r.description or "",
            "permissions": r.permissions or [],
            "user_count": count or 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r, count in rows
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip().lower()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre del rol es obligatorio.",
        )

    # Check duplicate
    existing = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un rol con ese nombre.",
        )

    # Create role
    new_role = Role(name=name, description=payload.description, permissions=payload.permissions)
    db.add(new_role)
    commit_or_500(db, "create_role")
    db.refresh(new_role)

    return {
        "id": str(new_role.id),
        "name": new_role.name,
        "description": new_role.description or "",
        "permissions": new_role.permissions,
        "created_at": new_role.created_at.isoformat() if new_role.created_at else None,
    }


class RoleUpdate(BaseModel):
    name: str | None = Field(None, max_length=64)
    description: str | None = Field(None)
    permissions: list[str] | None = Field(None)


@router.patch("/{id}")
def update_role(
    id: str,
    payload: RoleUpdate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        role_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado (ID inválido).",
        ) from None

    # 1. Look up role
    role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado.")

    # 2. Block system roles modification
    if role.name in ["administrador", "usuario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden modificar los roles del sistema (administrador, usuario).",
        )

    # 3. Update fields if supplied
    if payload.name is not None:
        name_clean = payload.name.strip().lower()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre del rol no puede estar vacío.",
            )

        # Check duplicate name on other roles
        existing = db.execute(
            select(Role).where(Role.name == name_clean, Role.id != role_uuid)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe otro rol con ese nombre.",
            )
        role.name = name_clean  # type: ignore

    if payload.description is not None:
        role.description = payload.description  # type: ignore

    if payload.permissions is not None:
        role.permissions = payload.permissions  # type: ignore

    commit_or_500(db, "update_role")
    db.refresh(role)

    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or "",
        "permissions": role.permissions,
        "created_at": role.created_at.isoformat() if role.created_at else None,
    }


router.include_router(delete_router)
