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


def test_deactivate_and_anonymize_borra_secretos_y_vinculos(monkeypatch):
    # Regresión: la baja dejaba claves de proveedor (heredadas por los vinculados),
    # TOTP, correo pendiente, vínculos y tokens de reset/verificación.
    monkeypatch.setattr(repo_module, "commit_or_500", lambda *_a, **_k: None)
    user = SimpleNamespace(
        id=uuid4(),
        email="ana@example.com",
        email_normalized="ana@example.com",
        full_name="Ana",
        phone_number=None,
        university_id=None,
        is_active=True,
        user_api_keys={"runware": "k"},
        llm_settings={"model": "x"},
        enabled_models=["m"],
        totp_secret="S",
        totp_enabled=True,
        totp_backup_codes=[{"hash": "h"}],
        pending_email="x@y.pe",
        pending_email_token_hash="t",
        pending_email_expires_at="2030-01-01",
    )
    db = MagicMock()
    db.get.return_value = user

    SqlAlchemyUserAccountRepository(db).deactivate_and_anonymize(user.id)

    assert user.user_api_keys == {}
    assert user.llm_settings == {}
    assert user.enabled_models == []
    assert user.totp_secret is None
    assert user.totp_enabled is False
    assert user.totp_backup_codes == []
    assert user.pending_email is None
    assert user.pending_email_token_hash is None
    assert user.pending_email_expires_at is None
    deleted = {
        call.args[0].table.name
        for call in db.execute.call_args_list
        if getattr(call.args[0], "is_delete", False)
    }
    assert deleted == {"user_links", "password_reset_tokens", "email_verification_tokens"}
