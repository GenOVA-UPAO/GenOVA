"""La baja de cuenta debe soltar el correo original también en la llave canónica."""

from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from users.infrastructure import sqlalchemy_account_repository as repo_module
from users.infrastructure.sqlalchemy_account_repository import SqlAlchemyUserAccountRepository


def test_deactivate_and_anonymize_libera_email_normalized(monkeypatch):
    monkeypatch.setattr(repo_module, "commit_or_500", lambda *_a, **_k: None)
    user = SimpleNamespace(
        id=uuid4(),
        email="ana@example.com",
        email_normalized="ana@example.com",
        full_name="Ana",
        phone_number="+51999888777",
        university_id=1,
        is_active=True,
    )
    db = MagicMock()
    db.get.return_value = user

    SqlAlchemyUserAccountRepository(db).deactivate_and_anonymize(user.id)

    assert user.is_active is False
    assert user.email.endswith(".removed.local")
    assert user.email_normalized == user.email.lower()
    assert "ana@example.com" not in (user.email, user.email_normalized)
    assert user.full_name == "[eliminado]"
