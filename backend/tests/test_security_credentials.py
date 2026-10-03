"""Corte de credenciales: un JWT emitido antes de un cambio/reset de contraseña deja de valer."""

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.security import HTTPAuthorizationCredentials  # noqa: E402
from sqlalchemy import select  # noqa: E402

from auth.infrastructure.jwt import build_token  # noqa: E402
from auth.infrastructure.reset_adapters import SqlAlchemyPasswordResetTokenRepository  # noqa: E402
from auth.interface.http.dependencies import get_current_user  # noqa: E402
from models import PasswordResetToken, RevokedToken, Role, User, UserRole  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402
from users.infrastructure.sqlalchemy_account_repository import (  # noqa: E402
    SqlAlchemyUserAccountRepository,
)


class _Req:
    cookies: dict = {}


@pytest.fixture
def db():
    s = make_session(
        User.__table__,
        Role.__table__,
        UserRole.__table__,
        RevokedToken.__table__,
        PasswordResetToken.__table__,
    )
    yield s
    s.close()


def _user(db) -> User:
    u = User(
        id=uuid.uuid4(),
        email="a@example.com",
        email_normalized="a@example.com",
        password_hash="x",
        full_name="Ana",
    )
    db.add(u)
    db.commit()
    return u


def _auth(db, token: str) -> User:
    return get_current_user(
        _Req(), HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), None, db
    )


def _token_at(user: User, when: datetime) -> str:
    # Formato de sesión ACTUAL (con aud): el test mide el corte por cambio de
    # contraseña, no la transición de tokens legacy, que depende de la fecha de
    # corte (jwt_legacy_issued_before) y lo volvía una bomba de tiempo.
    from core.security import JWT_ALGORITHM, JWT_AUDIENCE, JWT_SECRET

    return jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "iat": when,
            "exp": when + timedelta(hours=1),
            "iss": "genova",
            "aud": JWT_AUDIENCE,
            "jti": str(uuid.uuid4()),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def test_jwt_previo_al_reset_deja_de_valer(db):
    user = _user(db)
    old = _token_at(user, datetime.now(UTC) - timedelta(minutes=5))
    assert _auth(db, old).id == user.id

    repo = SqlAlchemyPasswordResetTokenRepository(db)
    repo.find_user(user.id)
    repo.apply_new_password(user.id, "nuevo-hash")

    with pytest.raises(HTTPException) as exc:
        _auth(db, old)
    assert exc.value.status_code == 401
    # Una sesión nueva sí entra.
    assert _auth(db, build_token(str(user.id), user.email)).id == user.id


def test_jwt_previo_al_cambio_de_clave_deja_de_valer_y_borra_resets_pendientes(db):
    user = _user(db)
    db.add(
        PasswordResetToken(
            user_id=user.id, token="pendiente", expires_at=datetime.now(UTC) + timedelta(hours=1)
        )
    )
    db.commit()
    old = _token_at(user, datetime.now(UTC) - timedelta(minutes=5))

    SqlAlchemyUserAccountRepository(db).update_password(user.id, "nuevo-hash")

    with pytest.raises(HTTPException):
        _auth(db, old)
    assert db.execute(select(PasswordResetToken)).first() is None
    assert _auth(db, build_token(str(user.id), user.email)).id == user.id
