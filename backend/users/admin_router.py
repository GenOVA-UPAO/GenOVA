from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from uuid import UUID

from auth.dependencies import require_admin
from database import get_db
from models import User, Role, UserRole

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role_id: str = Field(..., description="UUID del rol a asignar")


@router.get("/")
def get_users(
    page: int = 1,
    limit: int = 10,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 10

    offset = (page - 1) * limit

    total_items = db.execute(select(func.count(User.id))).scalar() or 0
    total_pages = (total_items + limit - 1) // limit

    users_db = (
        db.execute(
            select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
        )
        .scalars()
        .all()
    )

    users_list = []
    for u in users_db:
        user_role = db.execute(
            select(Role).join(UserRole).where(UserRole.user_id == u.id)
        ).scalars().first()

        role_info = None
        if user_role:
            role_info = {"id": str(user_role.id), "name": user_role.name}

        users_list.append(
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name or "",
                "role": role_info,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
        )

    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
        "users": users_list,
    }


@router.patch("/{id}/role")
def update_user_role(
    id: str,
    payload: UserRoleUpdate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    try:
        role_uuid = UUID(payload.role_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID de rol especificado es inválido.",
        )

    if target_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    target_role = db.execute(
        select(Role).where(Role.id == role_uuid)
    ).scalar_one_or_none()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe.",
        )

    try:
        db.execute(UserRole.__table__.delete().where(UserRole.user_id == target_uuid))
        db.flush()

        new_relation = UserRole(user_id=target_uuid, role_id=role_uuid)
        db.add(new_relation)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el rol en la base de datos: {str(e)}",
        )

    return {
        "id": str(target_user.id),
        "email": target_user.email,
        "full_name": target_user.full_name or "",
        "role": {"id": str(target_role.id), "name": target_role.name},
        "updated_at": target_user.updated_at.isoformat()
        if target_user.updated_at
        else None,
    }
