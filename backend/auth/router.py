"""Auth router — login + mounted sub-routers (register, session, reset, verify,
totp)."""

from datetime import UTC, datetime, timedelta

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.email_normalize import normalize_email
from auth.register_router import router as register_router
from auth.reset_router import router as reset_router
from auth.session_router import router as session_router
from auth.throttle import email_throttled
from auth.token_utils import issue_session_response
from auth.totp_helpers import _issue_ticket
from auth.totp_login_router import router as totp_login_router
from auth.totp_router import router as totp_router
from auth.verify_router import router as verify_router
from core.config import settings
from core.database import get_db
from core.rate_limit import limiter
from core.security import PASSWORD_MAX_LENGTH, verify_dummy, verify_password
from models import User

router = APIRouter()
logger = structlog.get_logger(__name__)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)
    remember_me: bool = False


def _is_locked(user: User) -> bool:
    if not user.locked_until:
        return False
    return user.locked_until > datetime.now(UTC)  # type: ignore[operator]


def _invalid_credentials() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
    )


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)

    # El throttle por-email también es un rate limit: respeta RATE_LIMIT_ENABLED=0
    # (CI/e2e/carga hacen decenas de logins seguidos con las cuentas seed).
    if settings.rate_limit_enabled and email_throttled(email):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "too_many_attempts",
                "message": "Demasiados intentos para esta cuenta. Espera un minuto.",
            },
        )

    user = db.execute(
        select(User).where(User.email_normalized == email)
    ).scalar_one_or_none()

    if not user:
        verify_dummy()
        return _invalid_credentials()

    if _is_locked(user):
        remaining = int(
            (user.locked_until - datetime.now(UTC)).total_seconds() // 60  # type: ignore[operator]
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "account_locked",
                "message": "Cuenta bloqueada temporalmente. Intenta más tarde.",
                "retry_after_minutes": max(1, remaining),
            },
        )

    if not verify_password(payload.password, str(user.password_hash)):
        user.failed_login_attempts += 1  # type: ignore[operator]
        if user.failed_login_attempts >= 5:  # type: ignore[operator]
            user.locked_until = datetime.now(UTC) + timedelta(minutes=15)  # type: ignore[assignment]
            user.failed_login_attempts = 0  # type: ignore[assignment]
        db.commit()
        return _invalid_credentials()

    if settings.email_verification_enabled and not user.email_verified:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "email_not_verified",
                "message": "Verifica tu correo para iniciar sesión. Revisa tu bandeja o solicita un nuevo enlace.",
            },
        )

    user.failed_login_attempts = 0  # type: ignore[assignment]
    user.locked_until = None  # type: ignore[assignment]
    db.commit()

    if user.totp_enabled:
        ticket = _issue_ticket(str(user.id), remember_me=payload.remember_me)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"totp_required": True, "ticket": ticket},
        )

    return issue_session_response(
        str(user.id), str(user.email), remember_me=payload.remember_me
    )


router.include_router(register_router)
router.include_router(session_router)
router.include_router(reset_router)
router.include_router(verify_router)
router.include_router(totp_router)
router.include_router(totp_login_router)
