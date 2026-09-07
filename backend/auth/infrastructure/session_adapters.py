"""Adaptadores de persistencia y JWT para los casos de uso de sesión."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import jwt
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.domain.user import AuthenticatedUser, TokenRevocation, UserAccess
from core.database import commit_or_500
from core.security import JWT_ALGORITHM, JWT_SECRET
from models import RevokedToken, Role, User, UserRole


def snapshot_authenticated_user(row: User) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=row.id,
        email=str(row.email),
        full_name=row.full_name,
        university_id=row.university_id,
        gender=row.gender,
        phone_number=row.phone_number,
        theme_settings=dict(row.theme_settings or {}),
        created_at=row.created_at,
        totp_enabled=bool(row.totp_enabled),
        totp_secret=str(row.totp_secret) if row.totp_secret else None,
        totp_backup_codes=[dict(entry) for entry in (row.totp_backup_codes or [])],
    )


class JwtSessionTokenDecoder:
    def decode_for_revocation(self, token: str) -> TokenRevocation | None:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.PyJWTError:
            return None
        jti = payload.get("jti")
        expires_at = payload.get("exp")
        if not jti or not expires_at:
            return None
        return TokenRevocation(
            jti=jti,
            user_id=payload.get("sub"),
            expires_at=datetime.fromtimestamp(expires_at, tz=UTC),
        )


class SqlAlchemyRevokedTokenRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def exists(self, jti: str) -> bool:
        return (
            self._db.execute(select(RevokedToken).where(RevokedToken.jti == jti)).scalar_one_or_none()
            is not None
        )

    def add(self, revocation: TokenRevocation) -> None:
        self._db.add(
            RevokedToken(
                jti=revocation.jti,
                user_id=revocation.user_id,
                expires_at=revocation.expires_at,
            )
        )
        commit_or_500(self._db, "logout")


class SqlAlchemySessionUserRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def access_for(self, user_id: UUID) -> UserAccess:
        rows = self._db.execute(
            select(Role, UserRole.is_primary)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
            .order_by(
                UserRole.is_primary.desc(),
                func.jsonb_array_length(Role.permissions).desc(),
                Role.name.asc(),
            )
        ).all()
        permissions = tuple(
            sorted({permission for role, _ in rows for permission in (role.permissions or [])})
        )
        return UserAccess(
            role=str(rows[0][0].name) if rows else None,
            permissions=permissions,
        )
