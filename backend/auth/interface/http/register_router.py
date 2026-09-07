"""Adaptador HTTP del registro de cuentas."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from auth.application.dto import RegisterInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.infrastructure.jwt import issue_session_response
from auth.interface.http.error_map import auth_error_to_response
from core.rate_limit import limiter
from core.security import PASSWORD_MAX_LENGTH

router = APIRouter(tags=["Autenticación"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


@router.post("/register", summary="Registrar una cuenta nueva")
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    auth: AuthUseCases = Depends(build_auth),
):
    try:
        result = auth.register_user.execute(
            RegisterInput(
                email=payload.email,
                password=payload.password,
                full_name=payload.full_name,
            )
        )
    except AuthError as err:
        return auth_error_to_response(err)

    if result.email_verification_required:
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "email_verification_required": True,
                "message": "Cuenta creada. Te enviamos un enlace de verificación a tu correo.",
            },
        )

    return issue_session_response(
        result.user_id,
        result.email,
        extra_content={"email_verification_required": False, "message": "Cuenta creada."},
    )
