import os

import pytest
import requests
from pytest_bdd import given, parsers, scenario, then, when

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "admin", "EN-014_llm-config.feature")

_URL = "/api/admin/llm-config"


def _split_model(spec: str) -> tuple[str, str]:
    """'openrouter/deepseek/deepseek-v4-flash' → ('openrouter', 'deepseek/deepseek-v4-flash')."""
    provider, _, model_id = spec.partition("/")
    return provider, model_id


@pytest.fixture(autouse=True)
def _reset_after(base_url, admin_token):
    """Restablece la config a vacío (cae a semilla) tras cada escenario."""
    yield
    requests.put(
        f"{base_url}{_URL}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"defaults": {}, "fallbacks": {}},
        timeout=10,
    )


# ── Scenarios ─────────────────────────────────────────────────────────────────

@scenario(FEATURE, "Admin obtiene la configuración efectiva")
def test_admin_get():
    pass


@scenario(FEATURE, "Admin guarda una configuración válida y se refleja")
def test_admin_put_valid():
    pass


@scenario(FEATURE, "Un modelo invalido se descarta y cae a la semilla")
def test_admin_put_invalid():
    pass


@scenario(FEATURE, "Un usuario no admin no puede leer la config")
def test_user_get_forbidden():
    pass


@scenario(FEATURE, "Un usuario no admin no puede guardar la config")
def test_user_put_forbidden():
    pass


# ── Given ─────────────────────────────────────────────────────────────────────

@given("que estoy autenticado como administrador", target_fixture="auth")
def auth_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@given("que estoy autenticado como usuario normal", target_fixture="auth")
def auth_user(user_token):
    return {"Authorization": f"Bearer {user_token}"}


# ── When ──────────────────────────────────────────────────────────────────────

@when("solicito la configuración de modelos", target_fixture="response")
def get_config(base_url, auth):
    return requests.get(f"{base_url}{_URL}", headers=auth, timeout=10)


@when(
    parsers.parse('guardo el modelo de codigo como "{spec}"'),
    target_fixture="response",
)
def put_codigo(base_url, auth, spec):
    provider, model_id = _split_model(spec)
    body = {"defaults": {"codigo": {"provider": provider, "model_id": model_id}}, "fallbacks": {}}
    return requests.put(f"{base_url}{_URL}", headers=auth, json=body, timeout=10)


@when(
    parsers.parse('intento guardar el modelo de codigo como "{spec}"'),
    target_fixture="response",
)
def put_codigo_intento(base_url, auth, spec):
    return put_codigo(base_url, auth, spec)


# ── Then ──────────────────────────────────────────────────────────────────────

@then(parsers.parse("la respuesta es {code:d}"))
def status_is(response, code):
    assert response.status_code == code


@then(parsers.parse('la config incluye las tareas "{t1}", "{t2}", "{t3}", "{t4}"'))
def config_tasks(response, t1, t2, t3, t4):
    defaults = response.json()["config"]["defaults"]
    for t in (t1, t2, t3, t4):
        assert t in defaults, f"falta tarea {t}"


@then("cada tarea tiene un modelo primario por defecto")
def each_task_default(response):
    for tarea, entry in response.json()["config"]["defaults"].items():
        assert entry.get("provider") and entry.get("model_id"), f"{tarea} sin modelo"


@then(parsers.parse('al consultar la config el modelo de codigo es "{spec}"'))
def codigo_is(base_url, admin_token, spec):
    provider, model_id = _split_model(spec)
    data = requests.get(
        f"{base_url}{_URL}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10
    ).json()
    cod = data["config"]["defaults"]["codigo"]
    assert (cod["provider"], cod["model_id"]) == (provider, model_id)


@then(parsers.parse('al consultar la config el modelo de codigo no es "{spec}"'))
def codigo_is_not(base_url, admin_token, spec):
    provider, model_id = _split_model(spec)
    data = requests.get(
        f"{base_url}{_URL}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10
    ).json()
    cod = data["config"]["defaults"]["codigo"]
    assert (cod["provider"], cod["model_id"]) != (provider, model_id)
