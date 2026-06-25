"""Email verification endpoints: confirm token and resend link.

Tokens use ``secrets.token_urlsafe(32)`` (brute force infeasible), expire in 24h
and are single-use. ``issue_verification`` is shared with the register flow.
"""

import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.cookies import set_auth_cookie
from auth.email import send_verification_email
from auth.email_normalize import normalize_email
from core.config import settings
from core.database import get_db
from core.rate_limit import limiter
from models import EmailVerificationToken, User

router = APIRouter()
logger = logging.getLogger(__name__)

FRONTEND_URL = settings.frontend_url.rstrip("/")
_TOKEN_TTL_HOURS = 24


class VerifyEmailSubmit(BaseModel):
    token: str = Field(..., min_length=8, max_length=512)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


def issue_verification(
    user: User, db: Session, background_tasks: BackgroundTasks
) -> None:
    """Replace any pending token for the user, persist a fresh one and queue the
    email. Caller commits. No-op email send when SMTP is unconfigured (dev)."""
    db.execute(
        EmailVerificationToken.__table__.delete().where(
            EmailVerificationToken.user_id == user.id
        )
    )
    token_str = secrets.token_urlsafe(32)
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token=token_str,
            expires_at=datetime.now(UTC) + timedelta(hours=_TOKEN_TTL_HOURS),
        )
    )

    verify_link = f"{FRONTEND_URL}/verificar-correo?token={token_str}"
    if settings.smtp_user and settings.smtp_password:
        background_tasks.add_task(
            send_verification_email, str(user.email), verify_link, user.full_name
        )
    else:
        logger.warning("SMTP not configured — verification link not emailed to %s", user.email)


def _build_login_response(user: User) -> JSONResponse:
    # Local import avoids a circular import with auth.router.
    from auth.router import build_token

    token = build_token(str(user.id), str(user.email))
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"message": "Correo verificado con éxito."},
    )
    set_auth_cookie(response, token)
    return response


@router.post("/verify-email")
@limiter.limit("10/minute")
def verify_email(request: Request, payload: VerifyEmailSubmit, db: Session = Depends(get_db)):
    record = db.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.token == payload.token.strip())
    ).scalar_one_or_none()
    if not record:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_token", "message": "El enlace de verificación es inválido o ya fue usado."},
        )

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        db.delete(record)
        db.commit()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "expired_token", "message": "El enlace de verificación ha expirado. Solicita uno nuevo."},
        )

    user = db.execute(select(User).where(User.id == record.user_id)).scalar_one_or_none()
    if not user:
        db.delete(record)
        db.commit()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "user_not_found", "message": "La cuenta asociada ya no existe."},
        )

    user.email_verified = True  # type: ignore[assignment]
    db.execute(
        EmailVerificationToken.__table__.delete().where(
            EmailVerificationToken.user_id == user.id
        )
    )
    db.commit()
    return _build_login_response(user)


@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification(
    request: Request,
    payload: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    # Respuesta genérica: no revela si el correo existe ni su estado.
    response = {
        "message": "Si el correo está registrado y pendiente de verificar, te enviamos un nuevo enlace."
    }
    email = normalize_email(payload.email)
    user = db.execute(
        select(User).where(User.email_normalized == email)
    ).scalar_one_or_none()
    if user and not user.email_verified:
        issue_verification(user, db, background_tasks)
        db.commit()
    return response
