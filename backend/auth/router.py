"""Auth router — login, register, /me. Mounts the reset-password sub-router."""
import logging
from datetime import datetime, timedelta, timezone
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


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


def build_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
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
    return user.locked_until > datetime.now(timezone.utc)  # type: ignore[operator]


def _invalid_credentials() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
    )


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    if not user:
        verify_dummy()
        return _invalid_credentials()

    if _is_locked(user):
        remaining = int(
            (user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60  # type: ignore[operator]
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
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)  # type: ignore[assignment]
            user.failed_login_attempts = 0  # type: ignore[assignment]
        db.commit()
        return _invalid_credentials()

    user.failed_login_attempts = 0  # type: ignore[assignment]
    user.locked_until = None  # type: ignore[assignment]
    db.commit()

    token = build_token(str(user.id), str(user.email))
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "access_token": token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRES_MINUTES * 60,
        },
    )


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
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"access_token": token, "token_type": "bearer"},
    )


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
