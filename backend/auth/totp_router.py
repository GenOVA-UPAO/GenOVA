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
import secrets
from datetime import UTC, datetime, timedelta

import pyotp
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.cookies import set_auth_cookie
from auth.dependencies import get_current_user, require_admin
from auth.router import build_token
from core.database import get_db
from core.rate_limit import limiter
from core.security import hash_password, verify_password
from models import User

router = APIRouter(prefix="/totp", tags=["totp"])
logger = logging.getLogger(__name__)

_APP_NAME = "GenOVA"

# Temporary tickets for the TOTP login step (in-memory; acceptable for single-instance).
# Maps ticket → {user_id, expires_at}
_TOTP_TICKETS: dict[str, dict] = {}
_TICKET_TTL_SECONDS = 300  # 5 min


def _clean_expired_tickets() -> None:
    now = datetime.now(UTC)
    expired = [k for k, v in _TOTP_TICKETS.items() if v["expires_at"] < now]
    for k in expired:
        del _TOTP_TICKETS[k]


def _issue_ticket(user_id: str) -> str:
    _clean_expired_tickets()
    ticket = secrets.token_urlsafe(32)
    _TOTP_TICKETS[ticket] = {
        "user_id": user_id,
        "expires_at": datetime.now(UTC) + timedelta(seconds=_TICKET_TTL_SECONDS),
    }
    return ticket


def _consume_ticket(ticket: str) -> str | None:
    _clean_expired_tickets()
    entry = _TOTP_TICKETS.pop(ticket, None)
    if not entry:
        return None
    if entry["expires_at"] < datetime.now(UTC):
        return None
    return entry["user_id"]


def _hash_backup(code: str) -> str:
    return hash_password(code)


def _verify_backup(code: str, hashed: str) -> bool:
    return verify_password(code, hashed)


def _generate_backup_codes() -> tuple[list[str], list[dict]]:
    """Returns (plaintext_codes, hashed_records) — plaintext shown once to user."""
    plaintext = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed = [{"hash": _hash_backup(c), "used": False} for c in plaintext]
    return plaintext, hashed


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


# ---------------------------------------------------------------------------
# Verify — second login step (ticket-based, unauthenticated)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Disable — authenticated user disables their own 2FA (requires current TOTP)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Admin force-disable
# ---------------------------------------------------------------------------


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
