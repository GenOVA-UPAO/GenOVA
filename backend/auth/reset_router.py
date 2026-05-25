"""Password reset finalization endpoint.

Lookup is by exact token match. Tokens are issued elsewhere
(`users/admin_account_router.py`) using `secrets.token_urlsafe(32)`, so brute
force is infeasible — we still rate-limit by IP to throttle scripted attempts.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import PasswordResetToken, User
from rate_limit import limiter
from security import hash_password

router = APIRouter()


class ResetPasswordSubmit(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)
    new_password: str = Field(..., min_length=8, max_length=128)


def _err(code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": code, "message": message},
    )


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, payload: ResetPasswordSubmit, db: Session = Depends(get_db)):
    token_str = payload.token.strip()
    new_pass = payload.new_password

    if not (any(c.isalpha() for c in new_pass) and any(c.isdigit() for c in new_pass)):
        return _err(
            "weak_password",
            "La nueva contraseña debe tener al menos 8 caracteres y contener letras y números.",
        )

    reset_token = db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token == token_str)
    ).scalar_one_or_none()
    if not reset_token:
        return _err("invalid_token", "El token de restablecimiento es inválido o ya ha sido utilizado.")

    expires_at = reset_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.delete(reset_token)
        db.commit()
        return _err("expired_token", "El token de restablecimiento ha expirado.")

    user = db.execute(select(User).where(User.id == reset_token.user_id)).scalar_one_or_none()
    if not user:
        return _err("user_not_found", "El usuario asociado a este token no existe.")

    user.password_hash = hash_password(new_pass)
    user.failed_login_attempts = 0
    user.locked_until = None

    db.execute(
        PasswordResetToken.__table__.delete().where(PasswordResetToken.user_id == user.id)
    )
    db.commit()
    return {"message": "Contraseña restablecida con éxito."}
