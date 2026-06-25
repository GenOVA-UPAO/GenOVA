"""Admin endpoints: edit profile + change role."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from core.database import get_db
from models import Role, User, UserRole
from users.admin.helpers import (
    assert_can_touch_target,
    commit_or_500,
    get_target_user,
    is_admin_user,
    normalize_gender,
    normalize_phone,
    parse_uuid,
)

router = APIRouter()


class UserRoleUpdate(BaseModel):
    role_id: str = Field(..., description="UUID del rol a asignar")


class UserProfileAdminUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    university_id: int | None = Field(default=None, ge=1)
    gender: str | None = Field(default=None, max_length=20)
    phone_number: str | None = Field(default=None, max_length=20)


def _check_duplicates(
    db: Session, *, target_uuid: UUID, email: str, phone: str | None, univ_id: int | None
) -> None:
    if db.execute(select(User.id).where(User.email == email, User.id != target_uuid)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado por otro usuario.",
        )
    if (
        phone
        and db.execute(
            select(User.id).where(User.phone_number == phone, User.id != target_uuid)
        ).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El número de teléfono ya está registrado por otro usuario.",
        )
    if (
        univ_id
        and db.execute(
            select(User.id).where(User.university_id == univ_id, User.id != target_uuid)
        ).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código universitario ya está registrado por otro usuario.",
        )


@router.patch("/{user_id}")
def update_user_profile(
    user_id: str,
    payload: UserProfileAdminUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)

    target_user = get_target_user(target_uuid, db)
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    gender = normalize_gender(payload.gender)
    phone = normalize_phone(payload.phone_number)

    _check_duplicates(
        db, target_uuid=target_uuid, email=email, phone=phone, univ_id=payload.university_id
    )

    target_user.full_name = full_name
    target_user.email = email
    target_user.university_id = payload.university_id
    target_user.gender = gender
    target_user.phone_number = phone

    commit_or_500(db, op="update_user_profile")
    return {"message": "Perfil actualizado exitosamente."}


@router.patch("/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    target_uuid = parse_uuid(user_id)
    try:
        role_uuid = UUID(payload.role_id)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="El ID de rol especificado es inválido."
        ) from exc

    if target_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo.",
        )

    assert_can_touch_target(caller=current_user, target_id=target_uuid, db=db)
    target_user = get_target_user(target_uuid, db)

    target_role = db.execute(select(Role).where(Role.id == role_uuid)).scalar_one_or_none()
    if not target_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="El rol especificado no existe."
        )

    if target_role.name == "administrador" and not is_admin_user(current_user.id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No tienes permisos para asignar el rol de administrador.",
        )

    db.execute(UserRole.__table__.delete().where(UserRole.user_id == target_uuid))
    db.flush()
    db.add(UserRole(user_id=target_uuid, role_id=role_uuid))
    commit_or_500(db, op="update_user_role")

    return {
        "id": str(target_user.id),
        "email": target_user.email,
        "full_name": target_user.full_name or "",
        "role": {"id": str(target_role.id), "name": target_role.name},
        "updated_at": target_user.updated_at.isoformat() if target_user.updated_at else None,
    }
