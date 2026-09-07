"""Account-security endpoints: change password and delete (deactivate) account.

Included into the settings profile router so paths keep the same prefix without
changing the users-router wiring.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.infrastructure.cookies import clear_auth_cookie
from core.database import commit_or_500, get_db
from core.rate_limit import limiter
from core.security import hash_password, verify_password
from users.application.account_service import anonymize_and_deactivate

router = APIRouter()


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña alfanumérica")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")


@router.post("/me/change-password", summary="Cambiar la contraseña propia")
@limiter.limit("5/minute")
def change_password(
    request: Request,
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


@router.delete("/me", summary="Eliminar la cuenta propia")
@limiter.limit("5/minute")
def delete_account(
    request: Request,
    payload: UserDeleteRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña incorrecta",
        )

    anonymize_and_deactivate(db, current_user)
    commit_or_500(db, "delete_account")

    response = JSONResponse(content={"message": "Cuenta eliminada exitosamente."})
    clear_auth_cookie(response)
    return response
