from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import User
from security import hash_password, verify_password

router = APIRouter()


class UserProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., description="Correo electrónico válido")


@router.patch("/me")
def update_profile(
    payload: UserProfileUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()

    if "@" not in email or "." not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ingresado no tiene un formato válido.",
        )

    existing_user = db.execute(
        select(User).where(User.email == email, User.id != current_user.id)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está en uso por otro usuario.",
        )

    current_user.full_name = full_name
    current_user.email = email

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar los datos del perfil: {str(e)}",
        )

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name or "",
        "created_at": current_user.created_at.isoformat()
        if current_user.created_at
        else None,
        "updated_at": current_user.updated_at.isoformat()
        if current_user.updated_at
        else None,
    }


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(
        ..., min_length=8, description="Nueva contraseña alfanumérica"
    )
    confirm_password: str = Field(
        ..., min_length=8, description="Confirmación de nueva contraseña"
    )


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

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al guardar la nueva contraseña: {str(e)}",
        )

    return {"message": "Contraseña actualizada con éxito."}
