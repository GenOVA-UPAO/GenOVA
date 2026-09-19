"""Adaptadores HTTP para verificar el correo y reenviar su enlace."""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field

from auth.application.dto import ResendVerificationInput, VerifyEmailInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.infrastructure.jwt import issue_session_response
from auth.interface.http.error_map import auth_error_to_response
from core.rate_limit import limiter

router = APIRouter(tags=["Autenticación"])


class VerifyEmailSubmit(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


@router.post("/verify-email", summary="Verificar el correo con el token recibido")
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    payload: VerifyEmailSubmit,
    auth: AuthUseCases = Depends(build_auth),
):
    try:
        result = auth.verify_email.execute(VerifyEmailInput(token=payload.token))
    except AuthError as err:
        return auth_error_to_response(err)
    return issue_session_response(
        result.user_id,
        result.email,
        extra_content={"message": "Correo verificado con éxito."},
    )


@router.post("/resend-verification", summary="Reenviar el correo de verificación")
@limiter.limit("3/minute")
def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    auth: AuthUseCases = Depends(build_auth),
):
    auth.resend_verification.execute(ResendVerificationInput(email=payload.email))
    return {
        "message": "Si el correo está registrado y pendiente de verificar, te enviamos un nuevo enlace."
    }
