"""/metrics (METRICS_ENABLED=1) no queda abierto en el puerto público.

Render publica un solo puerto: antes cualquiera leía contadores, latencias y
errores por ruta. Ahora exige `Authorization: Bearer <METRICS_TOKEN>`.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from core import metrics
from core.config import settings


def _client(monkeypatch, *, enabled=True, token="s3cret"):
    monkeypatch.setattr(settings, "metrics_enabled", enabled)
    monkeypatch.setattr(settings, "metrics_token", token)
    app = FastAPI()

    @app.get("/ping")
    def ping():
        return {"ok": True}

    assert metrics.setup_metrics(app) is enabled
    client = TestClient(app)
    client.get("/ping")
    return client


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer otro"}, {"Authorization": "s3cret"}])
def test_metrics_sin_token_valido_responde_404(monkeypatch, headers):
    assert _client(monkeypatch).get("/metrics", headers=headers).status_code == 404


def test_metrics_con_token_valido(monkeypatch):
    r = _client(monkeypatch).get("/metrics", headers={"Authorization": "Bearer s3cret"})
    assert r.status_code == 200
    assert "http_requests_total" in r.text


def test_metrics_sin_token_configurado_queda_cerrado(monkeypatch):
    r = _client(monkeypatch, token="").get("/metrics", headers={"Authorization": "Bearer "})
    assert r.status_code == 404


def test_metrics_apagado_no_expone_endpoint(monkeypatch):
    assert _client(monkeypatch, enabled=False).get("/metrics").status_code == 404
