"""Account-security endpoints: change password and delete (deactivate) account.

Included into the settings profile router so paths keep the same prefix without
changing the users-router wiring.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.cookies import clear_auth_cookie
from auth.dependencies import get_current_user
from core.database import commit_or_500, get_db
from core.security import hash_password, verify_password
from models import User

router = APIRouter()


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

    response = JSONResponse(content={"message": "Cuenta eliminada exitosamente."})
    clear_auth_cookie(response)
    return response
