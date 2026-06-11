"""Auth router — login, register, /me. Mounts the reset-password sub-router."""
import logging
import os
import threading
import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from auth.reset_router import router as reset_router
from database import get_db
from models import Role, User, UserRole
from rate_limit import limiter
from security import (
    JWT_ALGORITHM,
    JWT_EXPIRES_MINUTES,
    JWT_SECRET,
    PASSWORD_MAX_LENGTH,
    hash_password,
    verify_dummy,
    verify_password,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Per-email login throttle complements the per-IP slowapi limiter: blocks a
# distributed attacker that rotates IPs against one account. In-memory only —
# fine for single Render instance; needs Redis when scaling horizontally.
_EMAIL_LOGIN_WINDOW_S = 60.0
_EMAIL_LOGIN_MAX = 5
_email_attempts: dict[str, deque[float]] = defaultdict(deque)
_email_attempts_lock = threading.Lock()

# Cookie used by the new httpOnly auth flow.
_COOKIE_NAME = "genova_token"
_COOKIE_MAX_AGE = JWT_EXPIRES_MINUTES * 60
# When the frontend and backend live on different domains (e.g. Vercel +
# Railway) the session cookie is cross-site, so the browser only attaches it to
# API calls when SameSite=None. None is rejected unless Secure is also set, so
# we force Secure in that case. Same-origin deployments can keep the default.
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
if _COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    _COOKIE_SAMESITE = "lax"
_COOKIE_SECURE = _COOKIE_SAMESITE == "none" or os.getenv("COOKIE_SECURE", "1") != "0"


def _email_throttled(email: str) -> bool:
    now = time.monotonic()
    with _email_attempts_lock:
        q = _email_attempts[email]
        while q and now - q[0] > _EMAIL_LOGIN_WINDOW_S:
            q.popleft()
        if len(q) >= _EMAIL_LOGIN_MAX:
            return True
        q.append(now)
        return False


def _set_auth_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


def build_token(user_id: str, email: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRES_MINUTES),
        "iss": "genova",
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


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
    email = payload.email.strip().lower()

    if _email_throttled(email):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "too_many_attempts",
                "message": "Demasiados intentos para esta cuenta. Espera un minuto.",
            },
        )

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

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

    user.failed_login_attempts = 0  # type: ignore[assignment]
    user.locked_until = None  # type: ignore[assignment]
    db.commit()

    token = build_token(str(user.id), str(user.email))
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "access_token": token,
            "token_type": "bearer",
            "expires_in": _COOKIE_MAX_AGE,
        },
    )
    _set_auth_cookie(response, token)
    return response


@router.post("/register")
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email_exists", "message": "El correo ya está registrado."},
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=(payload.full_name or "").strip() or None,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email_exists", "message": "El correo ya está registrado."},
        )
    db.refresh(user)

    token = build_token(str(user.id), str(user.email))
    response = JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"access_token": token, "token_type": "bearer"},
    )
    _set_auth_cookie(response, token)
    return response


@router.post("/logout")
def logout() -> JSONResponse:
    response = JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})
    response.delete_cookie(
        key=_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
    )
    return response


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = (
        db.execute(
            select(Role)
            .join(UserRole)
            .where(UserRole.user_id == current_user.id)
            .order_by(Role.name)
        )
        .scalars()
        .first()
    )
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "university_id": current_user.university_id,
        "gender": current_user.gender or "",
        "phone_number": current_user.phone_number or "",
        "role": role.name if role else "usuario",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


router.include_router(reset_router)
