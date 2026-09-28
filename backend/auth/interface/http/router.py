"""Auth router — login + mounted sub-routers (register, session, reset, verify,
totp).

El flujo de login está extraído a caso de uso (``auth.application.use_cases
.LoginUser``); este router solo valida la petición, invoca el caso de uso y
traduce el resultado/errores a HTTP. El resto de sub-routers sigue en pase
estructural (2º pase pendiente).
"""

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field

from auth.application.dto import LoginInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.infrastructure.jwt import issue_session_response
from auth.interface.http.error_map import auth_error_to_response
from auth.interface.http.register_router import router as register_router
from auth.interface.http.reset_router import router as reset_router
from auth.interface.http.session_router import router as session_router
from auth.interface.http.totp_login_router import router as totp_login_router
from auth.interface.http.totp_router import router as totp_router
from auth.interface.http.verify_router import router as verify_router
from core.rate_limit import limiter
from core.security import PASSWORD_MAX_LENGTH

router = APIRouter()
logger = structlog.get_logger(__name__)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    remember_me: bool = False


@router.post(
    "/login", tags=["Autenticación"], summary="Iniciar sesión y recibir la cookie de sesión"
)
@limiter.limit("10/minute")
def login(
    request: Request,
    payload: LoginRequest,
    auth: AuthUseCases = Depends(build_auth),
):
    try:
        result = auth.login_user.execute(
            LoginInput(
                email=payload.email,
                password=payload.password,
                remember_me=payload.remember_me,
            )
        )
    except AuthError as err:
        return auth_error_to_response(err)

    if result.totp_required:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"totp_required": True, "ticket": result.totp_ticket},
        )

    return issue_session_response(result.user_id, result.email, remember_me=result.remember_me)


router.include_router(register_router)
router.include_router(session_router)
router.include_router(reset_router)
router.include_router(verify_router)
router.include_router(totp_router)
router.include_router(totp_login_router)
