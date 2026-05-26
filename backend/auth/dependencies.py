import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Role, User, UserRole
from security import JWT_ALGORITHM, JWT_SECRET

security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
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

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )
    return user


def require_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    is_admin = db.execute(
        select(UserRole)
        .join(Role)
        .where(UserRole.user_id == current_user.id, Role.name == "administrador")
    ).scalars().first()

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: se requieren privilegios de administrador.",
        )
    return current_user


def require_permission(required_permission: str):
    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        has_perm = db.execute(
            select(Role)
            .join(UserRole)
            .where(
                UserRole.user_id == current_user.id,
                Role.permissions.contains([required_permission])
            )
        ).scalars().first()

        if not has_perm:
            is_admin = db.execute(
                select(UserRole)
                .join(Role)
                .where(UserRole.user_id == current_user.id, Role.name == "administrador")
            ).scalars().first()
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Acceso denegado: se requiere el permiso '{required_permission}'.",
                )
        return current_user
    return dependency

