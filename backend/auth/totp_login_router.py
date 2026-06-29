"""TOTP login-step verification and 2FA disable endpoints (self + admin).

Shares the /totp prefix with totp_router (enrollment); both are included into
the auth router.
"""

from __future__ import annotations

import pyotp
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.cookies import set_auth_cookie
from auth.dependencies import get_current_user, require_admin
from auth.token_utils import build_token
from auth.totp_helpers import _consume_ticket, _verify_backup
from core.database import get_db
from core.rate_limit import limiter
from models import User

router = APIRouter(prefix="/totp", tags=["totp"])


class VerifyBody(BaseModel):
    ticket: str
    code: str


@router.post("/verify")
@limiter.limit("10/minute")
def totp_verify(
    request: Request,
    body: VerifyBody,
    db: Session = Depends(get_db),
) -> JSONResponse:
    user_id = _consume_ticket(body.ticket)
    if not user_id:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_ticket", "message": "Ticket inválido o expirado."},
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user or not user.totp_enabled or not user.totp_secret:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_ticket", "message": "Ticket inválido o expirado."},
        )

    code = body.code.strip().replace(" ", "")

    # Try TOTP first
    totp = pyotp.TOTP(str(user.totp_secret))
    if totp.verify(code, valid_window=1):
        token = build_token(str(user.id), str(user.email))
        response = JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "access_token": token,
                "token_type": "bearer",
                "expires_in": 60 * 60,
            },
        )
        set_auth_cookie(response, token)
        return response

    # Try backup codes
    codes: list[dict] = list(user.totp_backup_codes or [])
    for entry in codes:
        if not entry.get("used") and _verify_backup(code, entry["hash"]):
            entry["used"] = True
            user.totp_backup_codes = codes  # type: ignore[assignment]
            db.commit()
            token = build_token(str(user.id), str(user.email))
            response = JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "access_token": token,
                    "token_type": "bearer",
                    "expires_in": 60 * 60,
                    "backup_code_used": True,
                },
            )
            set_auth_cookie(response, token)
            return response

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": "invalid_code", "message": "Código incorrecto o expirado."},
    )


class DisableBody(BaseModel):
    code: str


@router.delete("")
@limiter.limit("5/minute")
def totp_disable_self(
    request: Request,
    body: DisableBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JSONResponse:
    if not current_user.totp_enabled or not current_user.totp_secret:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "totp_not_enabled", "message": "2FA no está activado."},
        )

    totp = pyotp.TOTP(str(current_user.totp_secret))
    if not totp.verify(body.code.strip(), valid_window=1):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_code", "message": "Código incorrecto o expirado."},
        )

    current_user.totp_secret = None  # type: ignore[assignment]
    current_user.totp_enabled = False  # type: ignore[assignment]
    current_user.totp_backup_codes = []  # type: ignore[assignment]
    db.commit()
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_disabled"})


class AdminDisableBody(BaseModel):
    user_id: str


@router.delete("/admin")
@limiter.limit("10/minute")
def totp_admin_disable(
    request: Request,
    body: AdminDisableBody,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JSONResponse:
    user = db.execute(select(User).where(User.id == body.user_id)).scalar_one_or_none()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "Usuario no encontrado."},
        )

    user.totp_secret = None  # type: ignore[assignment]
    user.totp_enabled = False  # type: ignore[assignment]
    user.totp_backup_codes = []  # type: ignore[assignment]
    db.commit()
    return JSONResponse(status_code=status.HTTP_200_OK, content={"status": "2fa_disabled"})
