import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import literal, select
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.security import JWT_ALGORITHM, JWT_SECRET
from models import RevokedToken, Role, User, UserRole

_COOKIE_NAME = "genova_token"
# Set AUTH_ACCEPT_BEARER=0 in production once all clients use cookies.
_ACCEPT_BEARER = settings.auth_accept_bearer
_security_scheme = HTTPBearer(auto_error=False)


def _extract_token(request: Request, creds: HTTPAuthorizationCredentials | None) -> str:
    """Prefer the httpOnly cookie; fall back to Bearer when explicitly enabled."""
    cookie = request.cookies.get(_COOKIE_NAME)
    if cookie:
        return cookie
    if _ACCEPT_BEARER and creds and creds.credentials:
        return creds.credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado.",
    )


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_security_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_token(request, creds)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación inválido o sin identificador de usuario.",
            )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido o expirado.",
        ) from exc

    # Un solo round-trip para las tres comprobaciones (RN-001): el token revocado
    # y el rol de administrador viajan como EXISTS correlacionados junto a la fila
    # de usuario. Contra el pooler remoto de Supabase cada consulta separada
    # costaba ~150 ms, y este dependency corre en TODA petición autenticada.
    jti = payload.get("jti")
    revoked_flag = (
        select(RevokedToken.jti).where(RevokedToken.jti == jti).exists() if jti else literal(False)
    )
    admin_flag = (
        select(UserRole.user_id)
        .join(Role, Role.id == UserRole.role_id)
        .where(UserRole.user_id == User.id, Role.name == "administrador")
        .exists()
    )

    row = db.execute(select(User, revoked_flag, admin_flag).where(User.id == user_id)).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )
    user, revoked, is_admin = row
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revocado. Inicia sesión nuevamente.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta desactivada.",
        )
    # Cache de petición: `ova.helpers._is_admin` lo lee en vez de repetir el JOIN
    # (14 llamadores hacían una consulta extra cada uno).
    user.admin_flag_cached = bool(is_admin)
    return user


def require_admin(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> User:
    # `get_current_user` ya resolvió el rol en su consulta única; solo se vuelve a
    # consultar si el atributo no está (llamadas directas fuera del dependency).
    is_admin = getattr(current_user, "admin_flag_cached", None)
    if is_admin is None:
        is_admin = bool(
            db.execute(
                select(UserRole)
                .join(Role)
                .where(UserRole.user_id == current_user.id, Role.name == "administrador")
            )
            .scalars()
            .first()
        )

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requieren privilegios de administrador.",
        )
    return current_user


def require_permission(required_permission: str):
    def dependency(
        current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> User:
        has_perm = (
            db.execute(
                select(Role)
                .join(UserRole)
                .where(
                    UserRole.user_id == current_user.id,
                    Role.permissions.contains([required_permission]),
                )
            )
            .scalars()
            .first()
        )

        if not has_perm:
            is_admin = (
                db.execute(
                    select(UserRole)
                    .join(Role)
                    .where(UserRole.user_id == current_user.id, Role.name == "administrador")
                )
                .scalars()
                .first()
            )
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado: se requiere el permiso '{required_permission}'.",
                )
        return current_user

    return dependency
