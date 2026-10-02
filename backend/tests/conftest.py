import os

import pytest
import requests
from pytest_bdd import when

BASE = os.getenv("BASE", "http://localhost:8000")


@when("envío el formulario")
def envio_formulario_global():
    pass  # shared across auth and roles scenarios


@pytest.fixture(scope="session")
def base_url():
    return BASE


@pytest.fixture(scope="session")
def admin_token(base_url):
    r = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@genova.ai", "password": "admin1234password"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def user_token(base_url):
    r = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "user@genova.ai", "password": "user1234password"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(autouse=True)
def _legacy_generation_by_default(request, monkeypatch):
    """Los tests del pipeline clásico (LLM→HTML, cassettes) no deben desviarse al
    motor por plantillas: se activa solo en los tests de ova_engine."""
    # El .env de desarrollo puede apuntar al stack local (Ollama/Laya/SD): los tests
    # nunca salen a la red por esa vía.
    monkeypatch.setenv("OVA_TEXT_BACKEND", "router")
    monkeypatch.setenv("OVA_DECISION_BACKEND", "rules")
    monkeypatch.delenv("LOCAL_IMAGE_URL", raising=False)
    if "ova_engine" not in request.node.nodeid:
        from core.config import settings

        monkeypatch.setattr(settings, "ova_engine_templates", False)
