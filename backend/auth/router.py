import re
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Body, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import (
    JWT_ALGORITHM,
    JWT_EXPIRES_MINUTES,
    JWT_SECRET,
    hash_password,
    verify_password,
)

router = APIRouter()

email_regex = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
password_regex = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")


def build_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def is_locked(user: User) -> bool:
    if not user.locked_until:
        return False
    return user.locked_until > datetime.now(timezone.utc)  # type: ignore


@router.post("/login")
def login(payload: dict = Body(default={}), db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email_regex.match(email) or not password:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
        )

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
        )

    if is_locked(user):
        remaining = int(
            (user.locked_until - datetime.now(timezone.utc)).total_seconds() // 60
        )
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "account_locked",
                "message": "Cuenta bloqueada temporalmente. Intenta más tarde.",
                "retry_after_minutes": max(1, remaining),
            },
        )

    if not verify_password(password, str(user.password_hash)):
        user.failed_login_attempts += 1  # type: ignore
        if user.failed_login_attempts >= 5:  # type: ignore
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)  # type: ignore
            user.failed_login_attempts = 0  # type: ignore
        db.commit()
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "invalid_credentials", "message": "Credenciales inválidas."},
        )

    user.failed_login_attempts = 0  # type: ignore
    user.locked_until = None  # type: ignore
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
def register(payload: dict = Body(default={}), db: Session = Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not email_regex.match(email):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_email", "message": "Formato de correo inválido."},
        )

    if not password_regex.match(password):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "invalid_password",
                "message": "La contraseña debe tener mínimo 8 caracteres y ser alfanumérica.",
            },
        )

    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email_exists", "message": "El correo ya está registrado."},
        )

    user = User(email=email, password_hash=hash_password(password))
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
