"""Un canje verifica como máximo un bcrypt y tiene presupuesto persistente."""
# ruff: noqa: F811

import uuid
from datetime import UTC, datetime

import pytest

from tests.test_security_link_redeem import _link, db  # noqa: F401
from users.application.dto import AcceptLinkInput
from users.application.use_cases.accept_link import AcceptLink
from users.domain.errors import InvalidLinkCode
from users.infrastructure.sqlalchemy_user_link_repository import SqlAlchemyUserLinkRepository


def test_selector_no_recorre_los_codigos_globales(db):
    for _ in range(8):
        _link(db)

    class Hasher:
        calls = 0

        def verify(self, code, hashed):
            self.calls += 1
            return False

    hasher = Hasher()
    with pytest.raises(InvalidLinkCode):
        AcceptLink(SqlAlchemyUserLinkRepository(db), hasher).execute(
            AcceptLinkInput(user_id=uuid.uuid4(), email="a@example.com", code="ABCDEF123456-0123456789ABCDEF0123456789ABCDEF01")
        )
    assert hasher.calls == 0


def test_presupuesto_de_intentos_es_atomico_y_persistente(db):
    link = _link(db)
    link.code_selector = "ABCDEF123456"
    db.commit()
    repo = SqlAlchemyUserLinkRepository(db)
    for _ in range(5):
        assert repo.reserve_attempt("ABCDEF123456", datetime.now(UTC), "a@example.com") is not None
    assert repo.reserve_attempt("ABCDEF123456", datetime.now(UTC), "a@example.com") is None
