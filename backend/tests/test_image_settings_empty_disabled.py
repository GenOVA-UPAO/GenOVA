"""Sin settings de imagen no se generan imágenes con la clave de plataforma."""

from __future__ import annotations

import importlib
from types import SimpleNamespace

import pytest
from starlette.requests import Request

from llm.images import image_enrich
from llm.images.sources import router


def test_resolve_provider_sin_settings_no_usa_la_clave_de_entorno(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-env")
    monkeypatch.delenv("LOCAL_IMAGE_URL", raising=False)
    assert router._resolve_provider_and_key({}) == ("", "")


def test_enrich_con_settings_vacios_no_genera(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-env")
    calls = []
    monkeypatch.setattr(image_enrich, "get_image_data_uri", lambda *a, **k: calls.append(a))
    monkeypatch.setattr(router, "get_image_data_uri", lambda *a, **k: calls.append(a))
    data = {"items": [{"imagen": {"tipo": "escena", "descripcion": "x"}}, {"prompt_imagen": "y"}]}
    assert image_enrich.enrich_with_images(data, {}) == {}
    assert image_enrich.enrich_with_images(data, None) == {}
    assert calls == []


@pytest.mark.parametrize("phase", ("explore", "explain", "elaborate", "evaluate"))
def test_router_de_fase_pasa_los_settings_del_admin(phase, monkeypatch):
    from core.rate_limit import limiter

    monkeypatch.setattr(limiter, "enabled", False)  # no gasta la cuota de otros tests
    mod = importlib.import_module(f"llm.phases.{phase}_router")
    seen = {}
    disabled = {"enabled": False, "provider": "none", "chain": [], "max_images": 0}

    def fake_generate(ph, n, concept, **kw):
        seen.update(kw)
        return SimpleNamespace(raw_json={}, html="<p>x</p>")

    monkeypatch.setattr(mod, "generate_resource", fake_generate)
    monkeypatch.setattr(mod, "retrieve_phase_context", lambda *a, **k: "")
    monkeypatch.setattr(mod, "build_image_settings", lambda user, db: disabled)
    request = Request({"type": "http", "method": "POST", "path": "/", "headers": [],
                       "client": ("1.1.1.1", 1), "server": ("t", 80), "scheme": "http"})
    req_cls = next(v for k, v in vars(mod).items() if k.startswith("Generate") and k.endswith("Request"))
    fn = getattr(mod, f"generate_{phase}_resource")
    fn(request, req_cls(resource_type=1, concept="Regresión"), SimpleNamespace(id="u"), None)
    assert seen["image_settings"] is disabled
