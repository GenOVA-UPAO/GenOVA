from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import Role
from auth.dependencies import require_admin
from pydantic import BaseModel, Field
from typing import List

router = APIRouter()


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=64, min_length=1)
    description: str = Field(default="")
    permissions: List[str] = Field(default_factory=list)


@router.get("")
def get_roles(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    roles = db.execute(select(Role)).scalars().all()
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "description": r.description or "",
            "permissions": r.permissions or [],
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in roles
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    name = payload.name.strip().lower()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre del rol es obligatorio."
        )

    # Check duplicate
    existing = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un rol con ese nombre."
        )

    # Create role
    new_role = Role(
        name=name,
        description=payload.description,
        permissions=payload.permissions
    )
    db.add(new_role)
    try:
        db.commit()
        db.refresh(new_role)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al crear el rol: {str(e)}"
        )

    return {
        "id": str(new_role.id),
        "name": new_role.name,
        "description": new_role.description or "",
        "permissions": new_role.permissions,
        "created_at": new_role.created_at.isoformat() if new_role.created_at else None
    }
