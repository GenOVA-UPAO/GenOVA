"""Editor visual con Jev en OpenRouter (mismo protocolo System One que Laya)."""

from __future__ import annotations

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import httpx  # noqa: E402

from editor import container  # noqa: E402
from editor.domain.model import ResourceBlock  # noqa: E402
from editor.infrastructure.interpreters.laya import LayaIntentInterpreter  # noqa: E402

BLOCKS = [
    ResourceBlock(id="b1", tipo="header", props={"title": "Índices"}),
    ResourceBlock(id="b2", tipo="panel", props={"title": "Viñeta 1"}),
    ResourceBlock(id="b3", tipo="panel", props={"title": "Viñeta 2"}),
]


def test_editor_usa_jev_si_el_motor_decide_con_jev(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "jev")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    monkeypatch.delenv("EDITOR_DECISION_BACKEND", raising=False)
    monkeypatch.delenv("OVA_DECISION_URL", raising=False)
    cfg = container._system_one()
    assert cfg["base_url"] == "https://openrouter.ai/api/alpha/decisions"
    assert cfg["headers"] == {"Authorization": "Bearer sk-test"}
    assert cfg["extra"]["model"] == "typesafe/jev-1.13"


def test_editor_puede_elegir_jev_aunque_el_motor_use_reglas(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "rules")
    monkeypatch.setenv("EDITOR_DECISION_BACKEND", "jev")
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    assert container._system_one()["base_url"].startswith("https://openrouter.ai/")


def test_sin_jev_sigue_con_laya_local(monkeypatch):
    monkeypatch.setenv("OVA_DECISION_BACKEND", "jev")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("EDITOR_DECISION_BACKEND", raising=False)
    monkeypatch.setenv("LAYA_URL", "http://localhost:8090/v1/systemone")
    assert container._system_one() == {"base_url": "http://localhost:8090/v1/systemone"}


def test_interprete_envia_auth_y_modelo_y_lee_confidence_de_jev(monkeypatch):
    sent = {}

    def fake_post(self, url, json=None, headers=None, **kw):
        sent.update(url=url, json=json, headers=headers)
        answers = {
            "accion": {"choice": "quitar", "confidence": 0.95},
            "tipo_bloque": {"choice": "panel", "confidence": 0.9},
            "indice": {"choice": "2", "confidence": 0.9},
            "destino": {"choice": "ninguno", "confidence": 0.9},
        }
        return httpx.Response(200, json={"answers": answers}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    interp = LayaIntentInterpreter(
        base_url="https://openrouter.ai/api/alpha/decisions",
        headers={"Authorization": "Bearer sk-test"},
        extra={"model": "typesafe/jev-1.13", "provider": {"data_collection": "deny"}},
        backend_tag="laya",
    )
    intent, _ = interp.interpret("quita la viñeta 2", BLOCKS)
    assert sent["headers"] == {"Authorization": "Bearer sk-test"}
    assert sent["json"]["model"] == "typesafe/jev-1.13" and "multilingual" not in str(sent["json"])
    assert intent.accion == "quitar" and intent.bloque.indice == 2
    assert intent.confianza > 0.9  # antes se ignoraba `confidence` y quedaba en 0.5
