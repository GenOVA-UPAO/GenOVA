"""Cambiar el correo del perfil mantiene `email_normalized`, la llave del login.

Regresión: el perfil solo actualizaba `email`; el login busca por
`email_normalized`, así que el correo nuevo daba «Credenciales inválidas» y el
anterior seguía entrando.
"""

import os
import sys
import uuid
from datetime import UTC, datetime

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import User  # noqa: E402
from users.infrastructure.sqlalchemy_admin_repository import (
    SqlAlchemyAdminUserRepository,  # noqa: E402
)
from users.infrastructure.sqlalchemy_profile_repository import (  # noqa: E402
    SqlAlchemyUserProfileRepository,
)


@compiles(JSONB, "sqlite")
def _jsonb_en_sqlite(_type, _compiler, **_kw):
    return "JSON"


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    # Los server_default de Postgres («'{}'::jsonb») no existen en SQLite: se quitan
    # solo durante el CREATE y se restauran.
    saved = {c: c.server_default for c in User.__table__.columns}
    for column in saved:
        column.server_default = None
    try:
        User.__table__.create(engine)
    finally:
        for column, default in saved.items():
            column.server_default = default
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _user(db, email: str) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        email_normalized=email.lower(),
        password_hash="x",
        full_name="Ana Prueba",
        # Sin server_default (ver la fixture): se dan explícitos.
        llm_settings={},
        enabled_models=[],
        ova_settings={},
        theme_settings={},
        resource_configs={},
        user_api_keys={},
        totp_backup_codes=[],
        created_at=datetime.now(UTC),
    )
    db.add(user)
    db.commit()
    return user


def _profile(email: str) -> dict:
    return {
        "full_name": "Ana Prueba",
        "email": email,
        "university_id": None,
        "gender": None,
        "phone_number": None,
    }


def test_perfil_propio_actualiza_email_normalized(db):
    user = _user(db, "vieja@example.com")
    SqlAlchemyUserProfileRepository(db).save_profile(
        user.id, **_profile("Nueva.Persona+tag@Example.com")
    )
    db.refresh(user)
    assert user.email_normalized == "nueva.persona@example.com"


def test_admin_actualiza_email_normalized(db):
    user = _user(db, "vieja@example.com")
    SqlAlchemyAdminUserRepository(db).update_profile(user.id, **_profile("otra@example.com"))
    db.refresh(user)
    assert user.email_normalized == "otra@example.com"


def test_email_en_uso_compara_la_llave_canonica(db):
    _user(db, "ocupado@example.com")
    otro = _user(db, "libre@example.com")
    repo = SqlAlchemyUserProfileRepository(db)
    assert repo.email_in_use("Ocupado+x@Example.com", excluding_user_id=otro.id)
    assert not repo.email_in_use("nuevo@example.com", excluding_user_id=otro.id)
