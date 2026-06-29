"""Session endpoints — logout (token revocation) and /me (current identity).
Included into the auth router."""

import logging
from datetime import UTC, datetime

import jwt
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.cookies import clear_auth_cookie
from auth.dependencies import get_current_user
from core.database import get_db
from core.security import JWT_ALGORITHM, JWT_SECRET
from models import RevokedToken, Role, User, UserRole

_security_scheme = HTTPBearer(auto_error=False)
_COOKIE_NAME = "genova_token"

router = APIRouter()
logger = logging.getLogger(__name__)


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
    # BU-002 AC#1/#2/#3: resolver el "rol primario" del usuario con un orden
    # determinista (is_primary=TRUE > más permisos > None). El antiguo
    # `roles[0].name` ordenado por nombre alfabético era ambiguo y provocaba
    # que la sidebar mostrara "usuario" cuando el rol real era "administrador".
    primary_role = db.execute(
        select(Role)
        .join(UserRole)
        .where(UserRole.user_id == current_user.id, UserRole.is_primary.is_(True))
        .limit(1)
    ).scalar_one_or_none()

    if primary_role is None:
        # Fallback: role con mayor nº de permisos (desempate por nombre).
        # Une UserRole a Role y ordena por jsonb_array_length(permissions) DESC.
        primary_role = db.execute(
            select(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == current_user.id)
            .order_by(
                func.jsonb_array_length(Role.permissions).desc(),
                Role.name.asc(),
            )
            .limit(1)
        ).scalar_one_or_none()

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
    permissions = sorted({p for r in roles for p in (r.permissions or [])})
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "university_id": current_user.university_id,
        "gender": current_user.gender or "",
        "phone_number": current_user.phone_number or "",
        "theme_settings": current_user.theme_settings,
        "role": primary_role.name if primary_role else None,
        "permissions": permissions,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "totp_enabled": bool(current_user.totp_enabled),
    }
