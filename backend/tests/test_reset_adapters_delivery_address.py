"""El enlace de reset va al correo guardado, no a la llave normalizada.

Regresión: `find_active_user` devolvía el correo normalizado (sin la +etiqueta y,
en Gmail, sin puntos), así que el enlace de «olvidé mi contraseña» de
«ana+genova@empresa.pe» se enviaba a «ana@empresa.pe», que en un servidor sin
subdirecciones es otro buzón.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from auth.infrastructure.reset_adapters import (  # noqa: E402
    SqlAlchemyPasswordResetTokenRepository,
)
from models import PasswordResetToken, User  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402


@pytest.fixture
def db():
    s = make_session(User.__table__, PasswordResetToken.__table__)
    yield s
    s.close()


def test_reset_se_envia_al_correo_guardado(db):
    db.add(
        User(
            id=uuid.uuid4(),
            email="ana+genova@empresa.pe",
            email_normalized="ana@empresa.pe",
            password_hash="x",
            full_name="Ana",
            is_active=True,
        )
    )
    db.commit()

    found = SqlAlchemyPasswordResetTokenRepository(db).find_active_user("ana@empresa.pe")

    assert found is not None
    assert found.email == "ana+genova@empresa.pe"
