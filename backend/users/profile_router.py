from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.security import hash_password, verify_password
from models import User

router = APIRouter()


class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    university_id: int | None = Field(default=None, ge=1)
    gender: str | None = Field(default=None, max_length=20)
    phone_number: str | None = Field(default=None, max_length=20)


@router.patch("/me")
def update_profile(
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()
    phone_number = payload.phone_number.strip() if payload.phone_number else None
    gender = payload.gender.strip().lower() if payload.gender else None

    if gender and gender not in ["masculino", "femenino", "otro"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sexo especificado debe ser 'masculino', 'femenino' o 'otro'.",
        )

    if phone_number:
        cleaned_phone = phone_number.replace("+", "").replace(" ", "").replace("-", "")
        if not cleaned_phone.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El número de teléfono solo debe contener dígitos y opcionalmente el signo '+'.",
            )

    existing_user = db.execute(
        select(User).where(User.email == email, User.id != current_user.id)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está en uso por otro usuario.",
        )

    if phone_number:
        dup_phone = db.execute(
            select(User).where(User.phone_number == phone_number, User.id != current_user.id)
        ).scalar_one_or_none()
        if dup_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El número de teléfono ya está en uso por otro usuario.",
            )

    if payload.university_id:
        dup_univ = db.execute(
            select(User).where(
                User.university_id == payload.university_id, User.id != current_user.id
            )
        ).scalar_one_or_none()
        if dup_univ:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El código universitario ya está registrado por otro usuario.",
            )

    current_user.full_name = full_name
    current_user.email = email
    current_user.university_id = payload.university_id
    current_user.gender = gender
    current_user.phone_number = phone_number

    commit_or_500(db, "update_profile")
    db.refresh(current_user)

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name or "",
        "university_id": current_user.university_id,
        "gender": current_user.gender or "",
        "phone_number": current_user.phone_number or "",
        "theme_settings": current_user.theme_settings,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }


class UserThemeUpdate(BaseModel):
    colorMode: str
    designMode: str
    palette: dict | None = None


@router.patch("/me/theme")
def update_theme(
    payload: UserThemeUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.theme_settings = {
        "colorMode": payload.colorMode,
        "designMode": payload.designMode,
        "palette": payload.palette,
    }
    commit_or_500(db, "update_theme")
    db.refresh(current_user)
    return {"message": "Tema actualizado", "theme_settings": current_user.theme_settings}


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña alfanumérica")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")


@router.post("/me/change-password")
def change_password(
    payload: UserPasswordChange,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_pass = payload.current_password
    new_pass = payload.new_password
    confirm_pass = payload.confirm_password

    if new_pass != confirm_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña y su confirmación no coinciden.",
        )

    if not (any(c.isalpha() for c in new_pass) and any(c.isdigit() for c in new_pass)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 8 caracteres y contener letras y números.",
        )

    if not verify_password(current_pass, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta.",
        )

    current_user.password_hash = hash_password(new_pass)
    commit_or_500(db, "change_password")
    return {"message": "Contraseña actualizada con éxito."}


class UserDeleteRequest(BaseModel):
    password: str = Field(..., description="Contraseña actual para confirmar")


@router.delete("/me")
def delete_account(
    payload: UserDeleteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña incorrecta",
        )

    from sqlalchemy.sql import func

    from models import Role, UserRole

    user_roles = (
        db.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == current_user.id)
        )
        .scalars()
        .all()
    )

    if "administrador" in user_roles:
        total_admins = db.execute(
            select(func.count(UserRole.user_id))
            .join(Role, Role.id == UserRole.role_id)
            .join(User, User.id == UserRole.user_id)
            .where(Role.name == "administrador", User.is_active)
        ).scalar()
        if total_admins and total_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes eliminar tu cuenta porque eres el único administrador activo.",
            )

    import uuid

    uid_suffix = str(uuid.uuid4())[:8]

    current_user.is_active = False
    current_user.email = f"deleted_{current_user.id}@{uid_suffix}.removed.local"
    current_user.full_name = "[eliminado]"
    current_user.phone_number = None
    current_user.university_id = None

    commit_or_500(db, "delete_account")

    from fastapi.responses import JSONResponse

    from auth.router import (
        _COOKIE_NAME,
        _COOKIE_PARTITIONED,
        _COOKIE_SAMESITE,
        _COOKIE_SECURE,
        _patch_partitioned,
    )

    response = JSONResponse(content={"message": "Cuenta eliminada exitosamente."})
    response.set_cookie(
        key=_COOKIE_NAME,
        value="",
        max_age=0,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    if _COOKIE_PARTITIONED:
        _patch_partitioned(response)
    return response
