from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from uuid import UUID
from database import get_db
from models import User, Role, UserRole
from auth.dependencies import require_admin, get_current_user
from pydantic import BaseModel, Field

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role_id: str = Field(..., description="UUID del rol a asignar")


@router.get("")
def get_users(
    page: int = 1,
    limit: int = 10,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 10

    offset = (page - 1) * limit

    # Count total items
    total_items = db.execute(select(func.count(User.id))).scalar() or 0
    total_pages = (total_items + limit - 1) // limit

    # Query users
    users_db = db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).scalars().all()

    users_list = []
    for u in users_db:
        # Get active role
        user_role = db.execute(
            select(Role)
            .join(UserRole)
            .where(UserRole.user_id == u.id)
        ).scalar_one_or_none()

        role_info = None
        if user_role:
            role_info = {
                "id": str(user_role.id),
                "name": user_role.name
            }

        users_list.append({
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name or "",
            "role": role_info,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })

    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
        "users": users_list
    }


@router.patch("/{id}/role")
def update_user_role(
    id: str,
    payload: UserRoleUpdate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db)
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido)."
        )

    try:
        role_uuid = UUID(payload.role_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El ID de rol especificado es inválido."
        )

    # 1. Prevent self-modification
    if target_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo."
        )

    # 2. Check if target user exists
    target_user = db.execute(select(User).where(User.id == target_uuid)).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    # 3. Check if target role exists
    target_role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe."
        )

    # 4. Atomic transaction update
    try:
        # Delete old roles for this user
        db.execute(
            UserRole.__table__.delete().where(UserRole.user_id == target_uuid)
        )
        db.flush()

        # Insert new role
        new_relation = UserRole(user_id=target_uuid, role_id=role_uuid)
        db.add(new_relation)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el rol en la base de datos: {str(e)}"
        )

    # 5. Return updated user info
    return {
        "id": str(target_user.id),
        "email": target_user.email,
        "full_name": target_user.full_name or "",
        "role": {
            "id": str(target_role.id),
            "name": target_role.name
        },
        "updated_at": target_user.updated_at.isoformat() if target_user.updated_at else None
    }


class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., description="Correo electrónico válido")


@router.patch("/me")
def update_profile(
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()

    # Formato básico de correo
    if "@" not in email or "." not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ingresado no tiene un formato válido."
        )

    # 1. Comprobar si el correo ya existe en otro usuario
    existing_user = db.execute(
        select(User).where(User.email == email, User.id != current_user.id)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está en uso por otro usuario."
        )

    # 2. Actualizar perfil
    current_user.full_name = full_name
    current_user.email = email

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar los datos del perfil: {str(e)}"
        )

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name or "",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None
    }
