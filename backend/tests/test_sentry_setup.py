"""Sentry opt-in: sin DSN no hay init; con DSN falso captura; before_send limpia."""

import sentry_sdk
from sentry_sdk.transport import Transport

from core import sentry_setup
from core.config import settings


class _Capture(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.events = []

    def capture_envelope(self, envelope):
        for item in envelope.items:
            if item.type == "event":
                self.events.append(item.payload.json)


def test_sin_dsn_no_inicializa(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", "")
    called = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: called.append(kw))
    assert sentry_setup.init_sentry() is False
    assert called == []


def test_con_dsn_falso_captura_excepcion(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", "https://pub@o0.ingest.sentry.io/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "test-env")
    real_init = sentry_sdk.init
    transport = _Capture()

    def fake_init(**kw):
        kw["transport"] = transport
        return real_init(**kw)

    monkeypatch.setattr(sentry_sdk, "init", fake_init)
    try:
        assert sentry_setup.init_sentry() is True
        try:
            raise ValueError("boom")
        except ValueError as exc:
            sentry_sdk.capture_exception(exc)
        sentry_sdk.flush()
    finally:
        sentry_sdk.init()  # reset sin DSN
    assert len(transport.events) == 1
    assert transport.events[0]["environment"] == "test-env"


def test_before_send_limpia_secretos():
    event = {
        "request": {
            "headers": {"Authorization": "Bearer abc.def", "Cookie": "s=1", "Host": "x"},
            "data": {"password": "hunter2"},
            "cookies": {"s": "1"},
        },
        "user": {"email": "a@b.co"},
        "extra": {"password": "hunter2", "api_key": "sk-abcdefgh12345678", "note": "ok"},
        "message": "fallo con sk-abcdefgh12345678",
    }
    out = sentry_setup.scrub_event(event)
    assert out["request"]["headers"] == {"Host": "x"}
    assert "data" not in out["request"] and "cookies" not in out["request"]
    assert "user" not in out
    assert out["extra"]["password"] == "[redacted]"
    assert out["extra"]["api_key"] == "[redacted]"
    assert out["extra"]["note"] == "ok"
    assert "sk-abcdefgh" not in out["message"]
