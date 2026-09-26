"""Unit puros del límite de intentos de login por email (HU-008).

auth/infrastructure/email_throttle.py complementa al rate limit por IP: frena a
un atacante que rota IPs contra una sola cuenta. La ventana se prueba sobre un
`MemoryWindow` con time.monotonic controlado (sin sleeps reales); que la cuenta
se comparta entre procesos se prueba con dos ventanas sobre el mismo almacén
(aquí) y contra Postgres real en test_shared_state_pg.py.

Uso:  pytest tests/test_auth_throttle.py -v
"""

import os
import sys

os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402

from auth.infrastructure import email_throttle as throttle  # noqa: E402
from core import shared_throttle  # noqa: E402
from core.shared_throttle import MemoryWindow, SharedWindow  # noqa: E402


@pytest.fixture
def clock(monkeypatch):
    """Reloj controlado + almacén limpio por test (el del módulo, en memoria)."""
    state = {"now": 1000.0}
    monkeypatch.setattr(shared_throttle.time, "monotonic", lambda: state["now"])
    monkeypatch.setattr(throttle.email_login_window, "store", MemoryWindow())
    return state


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


def test_insistir_bloqueado_no_alarga_la_ventana(clock):
    # Los intentos rechazados no se apuntan: al minuto del primer intento se
    # puede volver a probar aunque se haya insistido entretanto.
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        throttle.email_throttled("ana@upao.edu")
    clock["now"] += 30
    assert throttle.email_throttled("ana@upao.edu") is True
    clock["now"] += 31
    assert throttle.email_throttled("ana@upao.edu") is False


def test_dos_procesos_con_el_mismo_almacen_llevan_una_sola_cuenta(clock):
    # Dos workers de uvicorn = dos ventanas; lo que comparten es el almacén. Con
    # la cuenta en memoria de cada uno, alternar entre ellos daba 2× intentos.
    compartido = MemoryWindow()
    worker_a = throttle.EmailLoginWindow(store=compartido)
    worker_b = throttle.EmailLoginWindow(store=compartido)
    for i in range(throttle.EMAIL_LOGIN_MAX):
        assert (worker_a if i % 2 else worker_b).throttled("ana@upao.edu") is False
    assert worker_a.throttled("ana@upao.edu") is True
    assert worker_b.throttled("ana@upao.edu") is True


def test_el_almacen_no_guarda_el_correo_en_claro(clock):
    store = MemoryWindow()
    throttle.EmailLoginWindow(store=store).throttled("ana@upao.edu")
    ((bucket, subject),) = store._hits
    assert bucket == "login_email"
    assert "ana" not in subject and len(subject) == 64


def test_la_instancia_del_modulo_usa_el_almacen_compartido():
    assert isinstance(throttle.email_login_window.store, SharedWindow)


def test_el_adaptador_del_caso_de_uso_delega_en_la_ventana(clock):
    # Import local: login_adapters carga `settings` y, importado al recoger los
    # tests, lo fijaría antes de que el BDD de auth ajuste sus variables.
    from auth.infrastructure.login_adapters import EmailLoginThrottle

    adapter = EmailLoginThrottle()
    for _ in range(throttle.EMAIL_LOGIN_MAX):
        assert adapter.is_throttled("ana@upao.edu") is False
    assert adapter.is_throttled("ana@upao.edu") is True
