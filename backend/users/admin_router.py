import logging
from datetime import datetime, timedelta, timezone
import secrets
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from auth.email import send_reset_email
from database import get_db
from models import User, Role, UserRole, PasswordResetToken

logger = logging.getLogger(__name__)
router = APIRouter()

# Variable read from environment or defaulted
import os
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


class UserRoleUpdate(BaseModel):
    role_id: str = Field(..., description="UUID del rol a asignar")


class UserProfileAdminUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    university_id: int | None = Field(default=None, ge=1)
    gender: str | None = Field(default=None)
    phone_number: str | None = Field(default=None)


class UserStatusUpdate(BaseModel):
    is_active: bool


def is_admin_user(user_id: UUID, db: Session) -> bool:
    role = db.execute(
        select(Role).join(UserRole).where(UserRole.user_id == user_id)
    ).scalars().first()
    return role is not None and role.name == "administrador"


@router.get("/")
def get_users(
    page: int = 1,
    limit: int = 10,
    current_user=Depends(require_permission("manage_users")),
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
                "university_id": u.university_id,
                "gender": u.gender or "",
                "phone_number": u.phone_number or "",
                "is_active": u.is_active,
                "failed_login_attempts": u.failed_login_attempts,
                "locked_until": u.locked_until.isoformat() if u.locked_until else None,
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
    current_user=Depends(require_permission("manage_users")),
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

    # Hierarchy validation
    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
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

    if target_role.name == "administrador" and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No tienes permisos para asignar el rol de administrador.",
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


@router.patch("/{id}")
def update_user_profile(
    id: str,
    payload: UserProfileAdminUpdate,
    current_user=Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    phone_number = payload.phone_number.strip() if payload.phone_number else None
    gender = payload.gender.strip().lower() if payload.gender else None

    # Validate gender choice
    if gender and gender not in ["masculino", "femenino", "otro"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sexo especificado debe ser 'masculino', 'femenino' o 'otro'.",
        )

    # Validate phone_number characters
    if phone_number:
        cleaned_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        if not cleaned_phone.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El número de teléfono solo debe contener dígitos y opcionalmente el signo '+'.",
            )

    # Check email duplicate
    dup_email = db.execute(
        select(User).where(User.email == email, User.id != target_uuid)
    ).scalar_one_or_none()
    if dup_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado por otro usuario.",
        )

    # Check phone_number duplicate
    if phone_number:
        dup_phone = db.execute(
            select(User).where(User.phone_number == phone_number, User.id != target_uuid)
        ).scalar_one_or_none()
        if dup_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El número de teléfono ya está registrado por otro usuario.",
            )

    # Check university_id duplicate
    if payload.university_id:
        dup_univ = db.execute(
            select(User).where(User.university_id == payload.university_id, User.id != target_uuid)
        ).scalar_one_or_none()
        if dup_univ:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código universitario ya está registrado por otro usuario.",
            )

    target_user.full_name = full_name
    target_user.email = email
    target_user.university_id = payload.university_id
    target_user.gender = gender
    target_user.phone_number = phone_number

    try:
        db.commit()
        db.refresh(target_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar los datos del perfil: {str(e)}",
        )

    return {"message": "Perfil actualizado exitosamente."}


@router.patch("/{id}/status")
def update_user_status(
    id: str,
    payload: UserStatusUpdate,
    current_user=Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    if target_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propia cuenta.",
        )

    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    target_user.is_active = payload.is_active
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al actualizar el estado de la cuenta: {str(e)}",
        )

    return {"id": str(target_uuid), "is_active": target_user.is_active}


@router.post("/{id}/unlock")
def unlock_user(
    id: str,
    current_user=Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    target_user.failed_login_attempts = 0
    target_user.locked_until = None
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al desbloquear la cuenta: {str(e)}",
        )

    return {"id": str(target_uuid), "message": "Cuenta desbloqueada con éxito."}


@router.post("/{id}/reset-password-email")
def trigger_reset_email(
    id: str,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    # Clean old reset tokens
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == target_uuid))
    db.flush()

    # Generate token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    db_token = PasswordResetToken(user_id=target_uuid, token=token, expires_at=expires_at)
    db.add(db_token)
    db.commit()

    reset_link = f"{APP_URL}/reset-password?token={token}"
    background_tasks.add_task(send_reset_email, target_user.email, reset_link, target_user.full_name)

    return {"message": "Correo de restablecimiento encolado para su envío."}


@router.post("/{id}/reset-password-whatsapp")
def trigger_reset_whatsapp(
    id: str,
    current_user=Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    try:
        target_uuid = UUID(id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado (ID inválido).",
        )

    caller_is_admin = is_admin_user(current_user.id, db)
    target_is_admin = is_admin_user(target_uuid, db)

    if target_is_admin and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: No puedes modificar a un usuario administrador.",
        )

    target_user = db.execute(
        select(User).where(User.id == target_uuid)
    ).scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
        )

    if not target_user.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no tiene un número de teléfono registrado.",
        )

    # Clean old reset tokens
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == target_uuid))
    db.flush()

    # Generate 6-digit OTP code
    otp_code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    db_token = PasswordResetToken(user_id=target_uuid, token=otp_code, expires_at=expires_at)
    db.add(db_token)
    db.commit()

    text_msg = f"Hola, tu código de recuperación en GenOVA es: {otp_code}"

    return {
        "phone_number": target_user.phone_number,
        "otp_code": otp_code,
        "text": text_msg
    }
