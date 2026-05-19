from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from database import get_db
from models import Role, UserRole
from auth.dependencies import require_admin
from pydantic import BaseModel, Field
from typing import List, Optional
from roles.delete_router import router as delete_router

router = APIRouter()


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=64, min_length=1)
    description: str = Field(default="")
    permissions: List[str] = Field(default_factory=list)


@router.get("")
def get_roles(current_user=Depends(require_admin), db: Session = Depends(get_db)):
    roles = db.execute(select(Role)).scalars().all()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "description": r.description or "",
            "permissions": r.permissions or [],
            "user_count": db.execute(
                select(func.count(UserRole.user_id)).where(UserRole.role_id == r.id)
            ).scalar()
            or 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in roles
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
    new_role = Role(
        name=name, description=payload.description, permissions=payload.permissions
    )
    db.add(new_role)
    try:
        db.commit()
        db.refresh(new_role)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear el rol: {str(e)}",
        )

    return {
        "id": str(new_role.id),
        "name": new_role.name,
        "description": new_role.description or "",
        "permissions": new_role.permissions,
        "created_at": new_role.created_at.isoformat() if new_role.created_at else None,
    }


from uuid import UUID

class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=64)
    description: Optional[str] = Field(None)
    permissions: Optional[List[str]] = Field(None)


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
        )

    # 1. Look up role
    role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado."
        )

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

    try:
        db.commit()
        db.refresh(role)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el rol: {str(e)}",
        )

    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or "",
        "permissions": role.permissions,
        "created_at": role.created_at.isoformat() if role.created_at else None,
    }


router.include_router(delete_router)
