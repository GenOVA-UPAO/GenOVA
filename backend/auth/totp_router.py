"""2FA / TOTP endpoints.

Setup flow (user must already be logged in):
  POST /auth/totp/setup   → returns provisioning_uri + backup_codes (plaintext, shown once)
  POST /auth/totp/confirm → verifies first TOTP code, enables 2FA

Login flow (unauthenticated, after password verified):
  POST /auth/totp/verify  → receives totp_ticket + code, returns JWT cookie

Admin force-disable:
  DELETE /auth/totp        → admin only, disables 2FA for target user_id
"""

from __future__ import annotations

import logging

import pyotp
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.totp_helpers import _generate_backup_codes
from core.database import get_db
from core.rate_limit import limiter
from models import User

router = APIRouter(prefix="/totp", tags=["totp"])
logger = logging.getLogger(__name__)

_APP_NAME = "GenOVA"


# ---------------------------------------------------------------------------
# Setup — authenticated user begins TOTP enrollment
# ---------------------------------------------------------------------------


@router.post("/setup")
@limiter.limit("5/minute")
def totp_setup(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JSONResponse:
    if current_user.totp_enabled:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "totp_already_enabled", "message": "2FA ya está activado."},
        )

    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=str(current_user.email), issuer_name=_APP_NAME)

    plaintext_codes, hashed_codes = _generate_backup_codes()

    current_user.totp_secret = secret  # type: ignore[assignment]
    current_user.totp_backup_codes = hashed_codes  # type: ignore[assignment]
    db.commit()

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "provisioning_uri": uri,
            "secret": secret,
            "backup_codes": plaintext_codes,
        },
    )


# ---------------------------------------------------------------------------
# Confirm — verify first code to activate 2FA
# ---------------------------------------------------------------------------


class ConfirmBody(BaseModel):
    code: str


@router.post("/confirm")
@limiter.limit("10/minute")
def totp_confirm(
    request: Request,
    body: ConfirmBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JSONResponse:
    if not current_user.totp_secret:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "totp_not_setup", "message": "Primero llama a /totp/setup."},
        )
    if current_user.totp_enabled:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "totp_already_enabled", "message": "2FA ya está activado."},
        )

    totp = pyotp.TOTP(str(current_user.totp_secret))
    if not totp.verify(body.code.strip(), valid_window=1):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_code", "message": "Código incorrecto o expirado."},
        )

    current_user.totp_enabled = True  # type: ignore[assignment]
    db.commit()
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_enabled"})
