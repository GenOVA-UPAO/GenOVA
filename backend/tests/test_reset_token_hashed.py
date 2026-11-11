"""Los tokens de reset y de verificación se guardan como SHA-256, no en claro.

Regresión: `password_reset_tokens.token` y `email_verification_tokens.token`
guardaban el secreto tal cual; quien leyera la tabla (backup, panel de BD) podía
usar un reset pendiente para tomar la cuenta.
"""

import hashlib
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import select  # noqa: E402

from auth.infrastructure.reset_adapters import (  # noqa: E402
    SqlAlchemyPasswordResetTokenRepository,
)
from auth.infrastructure.verify_adapters import (  # noqa: E402
    SqlAlchemyEmailVerificationTokenRepository,
)
from models import EmailVerificationToken, PasswordResetToken, User  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402

RAW = "raw-token-abc"
DIGEST = hashlib.sha256(RAW.encode()).hexdigest()


@pytest.fixture
def db():
    s = make_session(User.__table__, PasswordResetToken.__table__, EmailVerificationToken.__table__)
    yield s
    s.close()


@pytest.fixture
def user_id(db):
    uid = uuid.uuid4()
    db.add(User(id=uid, email="ana@x.pe", email_normalized="ana@x.pe", password_hash="x",
                full_name="Ana", is_active=True))
    db.commit()
    return uid


def _exp():
    return datetime.now(UTC) + timedelta(hours=1)


def test_reset_guarda_digest_y_busca_por_token_en_claro(db, user_id):
    repo = SqlAlchemyPasswordResetTokenRepository(db)
    repo.replace_for_user(user_id, RAW, _exp())

    stored = db.execute(select(PasswordResetToken.token)).scalar_one()
    assert stored == DIGEST
    assert repo.find_by_token(RAW).user_id == user_id
    # El digest leído de la BD no sirve como token.
    assert repo.find_by_token(stored) is None

    repo.delete(RAW)
    assert db.execute(select(PasswordResetToken)).first() is None


def test_verificacion_guarda_digest_y_busca_por_token_en_claro(db, user_id):
    repo = SqlAlchemyEmailVerificationTokenRepository(db)
    repo.replace_for_user(user_id, RAW, _exp())

    stored = db.execute(select(EmailVerificationToken.token)).scalar_one()
    assert stored == DIGEST
    assert repo.find_by_token(RAW).user_id == user_id
    assert repo.find_by_token(stored) is None

    repo.delete(RAW)
    assert db.execute(select(EmailVerificationToken)).first() is None
