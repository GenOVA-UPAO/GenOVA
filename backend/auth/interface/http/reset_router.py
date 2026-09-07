"""Adaptadores HTTP para solicitar y completar la recuperación de contraseña."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from auth.application.dto import RequestPasswordResetInput, ResetPasswordInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.interface.http.error_map import auth_error_to_response
from core.rate_limit import limiter

router = APIRouter(tags=["Autenticación"])

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordSubmit(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)
    new_password: str = Field(..., min_length=8, max_length=128)


@router.post("/forgot-password", summary="Solicitar recuperación de contraseña")
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    auth: AuthUseCases = Depends(build_auth),
):
    auth.request_password_reset.execute(RequestPasswordResetInput(email=payload.email))
    return {
        "message": "Si el correo electrónico está registrado en GenOVA, recibirás un enlace para restablecer tu contraseña."
    }


@router.post("/reset-password", summary="Restablecer la contraseña con un token")
@limiter.limit("10/minute")
def reset_password(
    request: Request,
    payload: ResetPasswordSubmit,
    auth: AuthUseCases = Depends(build_auth),
):
    try:
        auth.reset_password.execute(
            ResetPasswordInput(token=payload.token, new_password=payload.new_password)
        )
    except AuthError as err:
        return auth_error_to_response(err)
    return {"message": "Contraseña restablecida con éxito."}
