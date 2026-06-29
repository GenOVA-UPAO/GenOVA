"""Registration endpoint — creates a user, assigns the default role, and sends
the mandatory email-verification link. Included into the auth router."""

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.email_normalize import normalize_email
from auth.verify_router import issue_verification
from core.database import get_db
from core.rate_limit import limiter
from core.security import PASSWORD_MAX_LENGTH, hash_password, password_complexity_ok
from models import PlatformConfig, Role, User, UserRole

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


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
    if db.execute(select(User).where(User.email_normalized == email_key)).scalar_one_or_none():
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
