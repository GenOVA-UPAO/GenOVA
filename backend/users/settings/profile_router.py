from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from models import User
from users.settings.account_router import router as account_router

router = APIRouter()
# Account-security endpoints (change password, delete) live in account_router;
# included here so they keep the same /me prefix.
router.include_router(account_router)


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
