"""Adaptadores HTTP del segundo paso de login y desactivación administrativa."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth.application.dto import AdminDisableTotpInput, VerifyTotpLoginInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.infrastructure.jwt import issue_session_response
from auth.interface.http.dependencies import require_admin
from auth.interface.http.error_map import auth_error_to_response
from core.rate_limit import limiter

router = APIRouter(prefix="/totp", tags=["Autenticación · TOTP"])


class VerifyBody(BaseModel):
    ticket: str
    code: str


class AdminDisableBody(BaseModel):
    user_id: str


@router.post("/verify", summary="Verificar el código TOTP al iniciar sesión")
@limiter.limit("10/minute")
def totp_verify(
    request: Request,
    body: VerifyBody,
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    try:
        result = auth.verify_totp_login.execute(
            VerifyTotpLoginInput(ticket=body.ticket, code=body.code)
        )
    except AuthError as err:
        return auth_error_to_response(err)

    extra_content = {"backup_code_used": True} if result.backup_code_used else None
    return issue_session_response(
        result.user_id,
        result.email,
        extra_content=extra_content,
        remember_me=result.remember_me,
    )


@router.delete("/admin", summary="Desactivar el TOTP de otro usuario (admin)")
@limiter.limit("10/minute")
def totp_admin_disable(
    request: Request,
    body: AdminDisableBody,
    _admin=Depends(require_admin),
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    try:
        auth.admin_disable_totp.execute(AdminDisableTotpInput(user_id=body.user_id))
    except AuthError as err:
        return auth_error_to_response(err)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_disabled"})
