"""Cambiar el correo (login + recuperación) exige la contraseña actual.

Una sesión robada no debe poder redirigir la recuperación de la cuenta a un buzón
del atacante sin conocer la contraseña.
"""

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import select  # noqa: E402

from tests._sqlite_db import make_session  # noqa: E402

from core.security import hash_password  # noqa: E402
from models import PasswordResetToken, User  # noqa: E402
from users.application.dto import UpdateProfileInput  # noqa: E402
from users.application.use_cases.update_user_profile import UpdateUserProfile  # noqa: E402
from users.domain.errors import IncorrectCurrentPassword  # noqa: E402
from users.infrastructure.password_adapters import CorePasswordHasher  # noqa: E402
from users.infrastructure.sqlalchemy_account_repository import (  # noqa: E402
    SqlAlchemyUserAccountRepository,
)
from users.infrastructure.sqlalchemy_profile_repository import (  # noqa: E402
    SqlAlchemyUserProfileRepository,
)

PASSWORD = "clave-correcta-123"


@pytest.fixture
def db():
    s = make_session(User.__table__, PasswordResetToken.__table__)
    yield s
    s.close()


@pytest.fixture
def user(db):
    u = User(
        id=uuid.uuid4(),
        email="victima@example.com",
        email_normalized="victima@example.com",
        password_hash=hash_password(PASSWORD),
        full_name="Victima Prueba",
        email_verified=True,
    )
    db.add(u)
    db.add(
        PasswordResetToken(
            user_id=u.id, token="pendiente", expires_at=datetime.now(UTC) + timedelta(hours=1)
        )
    )
    db.commit()
    return u


def _uc(db) -> UpdateUserProfile:
    return UpdateUserProfile(
        SqlAlchemyUserProfileRepository(db),
        SqlAlchemyUserAccountRepository(db),
        CorePasswordHasher(),
    )


def _input(user, email, current_password=None) -> UpdateProfileInput:
    return UpdateProfileInput(
        user_id=user.id,
        full_name="Victima Prueba",
        email=email,
        university_id=None,
        gender=None,
        phone_number=None,
        current_password=current_password,
    )


@pytest.mark.parametrize("pw", [None, "", "incorrecta-999"])
def test_cambiar_correo_sin_clave_valida_se_rechaza(db, user, pw):
    with pytest.raises(IncorrectCurrentPassword):
        _uc(db).execute(_input(user, "atacante@example.com", pw))
    db.refresh(user)
    assert user.email == "victima@example.com"
    assert user.email_normalized == "victima@example.com"


def test_cambiar_correo_con_clave_valida_funciona_y_borra_resets_pendientes(db, user):
    _uc(db).execute(_input(user, "nuevo@example.com", PASSWORD))
    db.refresh(user)
    assert user.email == "nuevo@example.com"
    assert db.execute(select(PasswordResetToken)).first() is None


def test_editar_otros_campos_sin_cambiar_correo_no_pide_clave(db, user):
    # Mismo correo (otra capitalización) = no es un cambio.
    _uc(db).execute(_input(user, "Victima@Example.com"))
    db.refresh(user)
    assert user.full_name == "Victima Prueba"
    assert db.execute(select(PasswordResetToken)).first() is not None
