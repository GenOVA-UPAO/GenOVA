"""Canje de vinculaciones: un código se consume una sola vez (UPDATE condicional atómico)."""

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from models import UserLink  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402
from users.domain.errors import InvalidLinkCode  # noqa: E402
from users.infrastructure.sqlalchemy_user_link_repository import (  # noqa: E402
    SqlAlchemyUserLinkRepository,
)


@pytest.fixture
def db():
    s = make_session(UserLink.__table__)
    yield s
    s.close()


def _link(db, **kw) -> UserLink:
    link = UserLink(
        id=uuid.uuid4(),
        owner_user_id=uuid.uuid4(),
        code_hash="h",
        expires_at=kw.pop("expires_at", datetime.now(UTC) + timedelta(hours=1)),
        **kw,
    )
    db.add(link)
    db.commit()
    return link


def test_segundo_canje_del_mismo_vinculo_falla_y_no_pisa_al_primero(db):
    link = _link(db)
    repo = SqlAlchemyUserLinkRepository(db)
    primero, segundo = uuid.uuid4(), uuid.uuid4()
    now = datetime.now(UTC)
    repo.redeem(str(link.id), linked_user_id=primero, consumed_at=now, op="t")
    with pytest.raises(InvalidLinkCode):
        repo.redeem(str(link.id), linked_user_id=segundo, consumed_at=now, op="t")
    db.refresh(link)
    assert link.linked_user_id == primero


def test_vinculo_expirado_no_se_canjea(db):
    link = _link(db, expires_at=datetime.now(UTC) - timedelta(minutes=1))
    repo = SqlAlchemyUserLinkRepository(db)
    with pytest.raises(InvalidLinkCode):
        repo.redeem(
            str(link.id), linked_user_id=uuid.uuid4(), consumed_at=datetime.now(UTC), op="t"
        )
