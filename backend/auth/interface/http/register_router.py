"""Registration endpoint — creates a user, assigns the default role, and sends
the email-verification link when EMAIL_VERIFICATION_ENABLED=1 (otherwise logs
the user in immediately). Included into the auth router."""

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth.domain.email import normalize_email
from auth.infrastructure.jwt import issue_session_response
from auth.interface.http.verify_router import issue_verification
from core.config import settings
from core.database import get_db
from core.rate_limit import limiter
from core.security import PASSWORD_MAX_LENGTH, hash_password, password_complexity_ok
from models import PlatformConfig, Role, User, UserRole

router = APIRouter(tags=["Autenticación"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=PASSWORD_MAX_LENGTH)
    full_name: str | None = Field(default=None, max_length=100)


@router.post("/register", summary="Registrar una cuenta nueva")
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
    # El rol por defecto se resuelve en un único round-trip: el nombre sale de
    # PlatformConfig con COALESCE al valor por defecto, sin una segunda consulta
    # (RN-001 — cada ida y vuelta al pooler remoto costaba ~150 ms).
    _role_name_sq = (
        select(PlatformConfig.value)
        .where(PlatformConfig.key == "default_registration_role")
        .scalar_subquery()
    )
    _role = db.execute(
        select(Role).where(Role.name == func.coalesce(_role_name_sq, "usuarios_prueba"))
    ).scalar_one_or_none()

    verification_required = settings.email_verification_enabled
    user = User(
        email=email_display,
        email_normalized=email_key,
        password_hash=hash_password(payload.password),
        full_name=full_name or None,
        # Se fija antes del INSERT en vez de con un UPDATE posterior.
        email_verified=not verification_required,
    )
    db.add(user)
    try:
        # flush (no commit) materializa el id sin cerrar la transacción ni pagar
        # un refresh extra; el unique de email_normalized es quien detecta el
        # duplicado, así que la comprobación previa por SELECT sobra.
        db.flush()
        if _role:
            db.add(UserRole(user_id=user.id, role_id=_role.id))
        if verification_required:
            issue_verification(user, db, background_tasks)
        # La sesión usa expire_on_commit=True: leer user.id/user.email después del
        # commit dispararía un SELECT de recarga. Se capturan antes.
        user_id, user_email = str(user.id), str(user.email)
        db.commit()
    except IntegrityError:
        db.rollback()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "email_exists", "message": "El correo ya está registrado."},
        )

    if verification_required:
        # Verificación obligatoria: no se inicia sesión hasta confirmar el correo.
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "email_verification_required": True,
                "message": "Cuenta creada. Te enviamos un enlace de verificación a tu correo.",
            },
        )

    # Verificación deshabilitada (EMAIL_VERIFICATION_ENABLED=0): la cuenta queda
    # activa al instante y se inicia sesión directamente.
    return issue_session_response(
        user_id,
        user_email,
        extra_content={"email_verification_required": False, "message": "Cuenta creada."},
    )
