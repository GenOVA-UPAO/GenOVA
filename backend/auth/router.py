"""Auth router — login, register, /me. Mounts the reset-password sub-router."""

import logging
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.cookies import clear_auth_cookie, set_auth_cookie
from auth.dependencies import get_current_user
from auth.email_normalize import normalize_email
from auth.reset_router import router as reset_router
from auth.throttle import email_throttled
from auth.token_utils import build_token
from auth.totp_router import _issue_ticket
from auth.totp_router import router as totp_router
from auth.verify_router import issue_verification
from auth.verify_router import router as verify_router
from core.config import settings
from core.database import get_db
from core.rate_limit import limiter
from core.security import (
    JWT_ALGORITHM,
    JWT_EXPIRES_MINUTES,
    JWT_SECRET,
    PASSWORD_MAX_LENGTH,
    hash_password,
    password_complexity_ok,
    verify_dummy,
    verify_password,
)
from models import PlatformConfig, RevokedToken, Role, User, UserRole

_security_scheme = HTTPBearer(auto_error=False)
_COOKIE_NAME = "genova_token"

router = APIRouter()
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


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

    if email_throttled(email):
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
        ticket = _issue_ticket(str(user.id))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"totp_required": True, "ticket": ticket},
        )

    token = build_token(str(user.id), str(user.email))
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "access_token": token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRES_MINUTES * 60,
        },
    )
    set_auth_cookie(response, token)
    return response


@router.post("/register")
@limiter.limit("5/minute")
def register(
    request: Request,
    payload: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email_display = payload.email.strip().lower()
    email_key = normalize_email(payload.email)
    if not password_complexity_ok(payload.password):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "weak_password",
                "message": "La contraseña debe tener al menos 8 caracteres con letras y números.",
            },
        )
    full_name = (payload.full_name or "").strip()
    if full_name and not any(c.isalpha() for c in full_name):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "invalid_name",
                "message": "El nombre debe contener al menos una letra.",
            },
        )
    if db.execute(
        select(User).where(User.email_normalized == email_key)
    ).scalar_one_or_none():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email_exists", "message": "El correo ya está registrado."},
        )

    user = User(
        email=email_display,
        email_normalized=email_key,
        password_hash=hash_password(payload.password),
        full_name=full_name or None,
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

    # Assign default registration role (from PlatformConfig, default: 'usuarios_prueba')
    _cfg = db.execute(
        select(PlatformConfig).where(PlatformConfig.key == "default_registration_role")
    ).scalar_one_or_none()
    _role_name = (_cfg.value if _cfg else None) or "usuarios_prueba"
    _role = db.execute(select(Role).where(Role.name == _role_name)).scalar_one_or_none()
    if _role:
        db.add(UserRole(user_id=user.id, role_id=_role.id))
        db.commit()

    if settings.email_verification_enabled:
        # Verificación obligatoria: no se inicia sesión hasta confirmar el correo.
        issue_verification(user, db, background_tasks)
        db.commit()
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "email_verification_required": True,
                "message": "Cuenta creada. Te enviamos un enlace de verificación a tu correo.",
            },
        )

    # Verificación deshabilitada (EMAIL_VERIFICATION_ENABLED=0): la cuenta queda
    # activa al instante y se inicia sesión directamente.
    user.email_verified = True  # type: ignore[assignment]
    db.commit()
    token = build_token(str(user.id), str(user.email))
    response = JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "email_verification_required": False,
            "access_token": token,
            "token_type": "bearer",
            "expires_in": JWT_EXPIRES_MINUTES * 60,
            "message": "Cuenta creada.",
        },
    )
    set_auth_cookie(response, token)
    return response


@router.post("/logout")
def logout(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_security_scheme),
    db: Session = Depends(get_db),
) -> JSONResponse:
    token = request.cookies.get(_COOKIE_NAME)
    if not token and creds:
        token = creds.credentials
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            jti = payload.get("jti")
            exp = payload.get("exp")
            user_id = payload.get("sub")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=UTC)
                if not db.execute(
                    select(RevokedToken).where(RevokedToken.jti == jti)
                ).scalar_one_or_none():
                    db.add(RevokedToken(jti=jti, user_id=user_id, expires_at=expires_at))
                    db.commit()
        except jwt.PyJWTError:
            pass  # token malformed/expired — revocation skipped, cookie cleared below
    response = JSONResponse(status_code=status.HTTP_200_OK, content={"status": "ok"})
    clear_auth_cookie(response)
    return response


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    roles = (
        db.execute(
            select(Role)
            .join(UserRole)
            .where(UserRole.user_id == current_user.id)
            .order_by(Role.name)
        )
        .scalars()
        .all()
    )
    role = roles[0] if roles else None
    permissions = sorted({p for r in roles for p in (r.permissions or [])})
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "university_id": current_user.university_id,
        "gender": current_user.gender or "",
        "phone_number": current_user.phone_number or "",
        "theme_settings": current_user.theme_settings,
        "role": role.name if role else "usuario",
        "permissions": permissions,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "totp_enabled": bool(current_user.totp_enabled),
    }


router.include_router(reset_router)
router.include_router(verify_router)
router.include_router(totp_router)
