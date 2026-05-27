import os
import requests
import pytest
from pytest_bdd import given, when, then, scenario, parsers

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE_HISTORIAL = os.path.join(_FEATURES, "ova", "HU-006_historial.feature")
FEATURE_EXPORTAR = os.path.join(_FEATURES, "ova", "HU-004_exportar-scorm.feature")
FEATURE_DB = os.path.join(_FEATURES, "setup", "EN-008_base-datos.feature")


# ── EN-008: Base de Datos ─────────────────────────────────────────────────────

@scenario(FEATURE_DB, "Endpoint de salud de base de datos responde ok")
def test_db_health():
    pass


@given("el backend FastAPI en ejecución")
def backend_en_ejecucion():
    pass


@when("se realiza GET a /api/db/health", target_fixture="response")
def get_db_health(base_url):
    return requests.get(f"{base_url}/api/db/health", timeout=10)


@then('la respuesta es 200 con estado "ok"')
def db_health_ok(response):
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok" or data.get("db") == "ok"


# ── HU-006: Historial de OVAs ─────────────────────────────────────────────────

@scenario(FEATURE_HISTORIAL, "CA-01 — Listado de OVAs propios")
def test_historial_listado():
    pass


@given(parsers.parse('el usuario "{email}" está autenticado'))
def usuario_autenticado(email):
    pass  # token comes via fixture


@given("existen OVAs creados por ese usuario")
def ovas_creados():
    pass  # assumes seeded test data or prior test runs


@when("navega a /mis-ovas", target_fixture="response")
def navegar_mis_ovas(base_url, user_token):
    return requests.get(
        f"{base_url}/api/ovas",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=10,
    )


@then("recibe la lista de sus OVAs ordenada por fecha descendente")
def lista_ovas(response):
    assert response.status_code == 200
    data = response.json()
    assert "ovas" in data or isinstance(data, list)


# ── HU-004: Exportar SCORM ────────────────────────────────────────────────────

@scenario(FEATURE_EXPORTAR, "CA-01 — Descarga exitosa del paquete SCORM")
def test_exportar_scorm():
    pass


@given(parsers.parse('existe el OVA "{title}" con id "{ova_id}" con status "listo"'))
def ova_listo(title, ova_id):
    pass  # assumes seeded data


@when(
    parsers.parse('el usuario hace GET a "/api/ovas/{ova_id}/download"'),
    target_fixture="response",
)
def get_scorm(base_url, user_token, ova_id):
    return requests.get(
        f"{base_url}/api/ovas/{ova_id}/download",
        headers={"Authorization": f"Bearer {user_token}"},
        allow_redirects=True,
        timeout=30,
    )


@then("el servidor responde con el archivo ZIP o una redirección a la URL firmada")
def scorm_descarga(response):
    assert response.status_code in (200, 302)
