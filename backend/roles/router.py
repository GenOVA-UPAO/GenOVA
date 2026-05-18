from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from database import get_db
from models import Role, UserRole
from auth.dependencies import require_admin
from pydantic import BaseModel, Field
from typing import List, Optional

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
            "user_count": db.execute(
                select(func.count(UserRole.user_id)).where(UserRole.role_id == r.id)
            ).scalar() or 0,
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
    db: Session = Depends(get_db)
):
    try:
        role_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado (ID inválido)."
        )

    # 1. Look up role
    role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado."
        )

    # 2. Block system roles modification
    if role.name in ["administrador", "usuario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden modificar los roles del sistema (administrador, usuario)."
        )

    # 3. Update fields if supplied
    if payload.name is not None:
        name_clean = payload.name.strip().lower()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre del rol no puede estar vacío."
            )
        
        # Check duplicate name on other roles
        existing = db.execute(
            select(Role)
            .where(Role.name == name_clean, Role.id != role_uuid)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe otro rol con ese nombre."
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
            detail=f"Error al actualizar el rol: {str(e)}"
        )

    return {
        "id": str(role.id),
        "name": role.name,
        "description": role.description or "",
        "permissions": role.permissions,
        "created_at": role.created_at.isoformat() if role.created_at else None
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    id: str,
    reassign_to_id: Optional[str] = None,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        role_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado (ID inválido)."
        )

    # 1. Look up role
    role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado."
        )

    # 2. Block system roles deletion
    if role.name in ["administrador", "usuario"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden eliminar los roles del sistema (administrador, usuario)."
        )

    # 3. Query current users count linked to this role
    user_count = db.execute(
        select(func.count(UserRole.user_id)).where(UserRole.role_id == role_uuid)
    ).scalar() or 0

    # 4. Handle reassignment logic if user_count > 0
    if user_count > 0:
        if not reassign_to_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El rol tiene {user_count} usuario(s) asignado(s) y no se especificó un rol de reasignación."
            )
        
        try:
            target_uuid = UUID(reassign_to_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El ID de reasignación es inválido."
            )

        if target_uuid == role_uuid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede reasignar al mismo rol que se está eliminando."
            )

        # Look up target role
        target_role = db.execute(select(Role).where(Role.id == target_uuid)).scalar_one_or_none()
        if not target_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El rol de reasignación especificado no existe."
            )

        # Perform atomic migration inside a transaction block
        try:
            # Query all UserRole relations of this role
            relations = db.execute(select(UserRole).where(UserRole.role_id == role_uuid)).scalars().all()
            for rel in relations:
                # Check if user already has target role
                has_target = db.execute(
                    select(UserRole).where(UserRole.user_id == rel.user_id, UserRole.role_id == target_uuid)
                ).scalar_one_or_none()
                if has_target:
                    # User already has target role relation, just delete old relation
                    db.delete(rel)
                else:
                    # Update old relation to target role (delete and recreate to avoid primary key issues)
                    user_id_val = rel.user_id
                    db.delete(rel)
                    db.flush()
                    new_rel = UserRole(user_id=user_id_val, role_id=target_uuid)
                    db.add(new_rel)
            
            db.flush()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error durante la reasignación de usuarios: {str(e)}"
            )

    # 5. Delete the role
    try:
        db.delete(role)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al eliminar el rol de la base de datos: {str(e)}"
        )

    return
