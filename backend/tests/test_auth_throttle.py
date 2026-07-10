"""Unit puros del throttle por-email del login (HU-008 — bloqueo de intentos).

auth/throttle.py complementa al rate limit por IP: bloquea a un atacante que
rota IPs contra una sola cuenta. Se testea la ventana deslizante en memoria
controlando time.monotonic con monkeypatch (sin sleeps reales).

Uso:  pytest tests/test_auth_throttle.py -v
"""

import os
import sys

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from auth import throttle  # noqa: E402


@pytest.fixture
def clock(monkeypatch):
    """Reloj controlado + estado limpio del módulo por test."""
    state = {"now": 1000.0}
    monkeypatch.setattr(throttle.time, "monotonic", lambda: state["now"])
    throttle._email_attempts.clear()
    yield state
    throttle._email_attempts.clear()


def test_permite_hasta_el_maximo(clock):
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        assert throttle.email_throttled("ana@upao.edu") is False


def test_bloquea_el_intento_extra(clock):
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        throttle.email_throttled("ana@upao.edu")
    assert throttle.email_throttled("ana@upao.edu") is True


def test_emails_distintos_no_comparten_ventana(clock):
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        throttle.email_throttled("ana@upao.edu")
    assert throttle.email_throttled("otro@upao.edu") is False


def test_la_ventana_expira(clock):
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        throttle.email_throttled("ana@upao.edu")
    assert throttle.email_throttled("ana@upao.edu") is True
    clock["now"] += throttle.EMAIL_LOGIN_WINDOW_S + 1
    assert throttle.email_throttled("ana@upao.edu") is False
