"""Adaptadores HTTP para enrolar, confirmar y desactivar TOTP."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from auth.application.dto import ConfirmTotpInput, DisableTotpInput, SetupTotpInput
from auth.container import AuthUseCases, build_auth
from auth.domain.errors import AuthError
from auth.infrastructure.session_adapters import snapshot_authenticated_user
from auth.interface.http.dependencies import get_current_user
from auth.interface.http.error_map import auth_error_to_response
from core.rate_limit import limiter

router = APIRouter(prefix="/totp", tags=["Autenticación · TOTP"])


class ConfirmBody(BaseModel):
    code: str


class DisableBody(BaseModel):
    code: str


@router.post("/setup", summary="Iniciar el alta del segundo factor TOTP")
@limiter.limit("5/minute")
def totp_setup(
    request: Request,
    current_user=Depends(get_current_user),
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    try:
        result = auth.setup_totp.execute(
            SetupTotpInput(user=snapshot_authenticated_user(current_user))
        )
    except AuthError as err:
        return auth_error_to_response(err)
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "provisioning_uri": result.provisioning_uri,
            "secret": result.secret,
            "backup_codes": list(result.backup_codes),
        },
    )


@router.post("/confirm", summary="Confirmar el alta del TOTP con el primer código")
@limiter.limit("10/minute")
def totp_confirm(
    request: Request,
    body: ConfirmBody,
    current_user=Depends(get_current_user),
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    try:
        auth.confirm_totp.execute(
            ConfirmTotpInput(
                user=snapshot_authenticated_user(current_user),
                code=body.code,
            )
        )
    except AuthError as err:
        return auth_error_to_response(err)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_enabled"})


@router.delete("", summary="Desactivar el TOTP de la cuenta propia")
@limiter.limit("5/minute")
def totp_disable_self(
    request: Request,
    body: DisableBody,
    current_user=Depends(get_current_user),
    auth: AuthUseCases = Depends(build_auth),
) -> JSONResponse:
    try:
        auth.disable_totp.execute(
            DisableTotpInput(
                user=snapshot_authenticated_user(current_user),
                code=body.code,
            )
        )
    except AuthError as err:
        return auth_error_to_response(err)
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_disabled"})
