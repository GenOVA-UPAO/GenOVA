"""El buzón nuevo y el segundo factor deben verificarse antes del cambio."""
# ruff: noqa: F811

from dataclasses import replace

import pyotp
import pytest

from tests.test_security_email_change import PASSWORD, _input, _uc, db, user  # noqa: F401


def test_email_permanece_hasta_confirmar_y_token_es_de_un_solo_uso(db, user, monkeypatch):
    sent = []
    monkeypatch.setattr(
        "users.infrastructure.sqlalchemy_profile_repository.send_email_change",
        lambda email, token: sent.append((email, token)),
        raising=False,
    )
    _uc(db).execute(_input(user, "nuevo@example.com", PASSWORD))
    assert user.email == "victima@example.com"
    assert sent[0][0] == "nuevo@example.com"
    repo = _uc(db).repo
    repo.confirm_email_change(user.id, sent[0][1])
    assert user.email == "nuevo@example.com"
    with pytest.raises(Exception, match="inválido|expirado"):
        repo.confirm_email_change(user.id, sent[0][1])


def test_email_con_2fa_exige_totp(db, user, monkeypatch):
    monkeypatch.setattr(
        "users.infrastructure.sqlalchemy_profile_repository.send_email_change",
        lambda *args: None,
        raising=False,
    )
    user.totp_enabled = True
    user.totp_secret = pyotp.random_base32()
    db.commit()
    with pytest.raises(Exception, match="TOTP"):
        _uc(db).execute(_input(user, "nuevo@example.com", PASSWORD))
    data = replace(_input(user, "nuevo@example.com", PASSWORD), totp_code=pyotp.TOTP(user.totp_secret).now())
    _uc(db).execute(data)
    assert user.email == "victima@example.com"
