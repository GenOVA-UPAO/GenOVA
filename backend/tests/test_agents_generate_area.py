"""`/api/agents/*/generate` recibe el área temática vía el proveedor de `core`."""

from __future__ import annotations

import importlib
from types import SimpleNamespace

import pytest

import core.topic_area as topic_area

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")


@pytest.fixture(autouse=True)
def _reset_provider():
    yield
    topic_area.set_topic_area_provider(None)


def test_sin_proveedor_o_con_fallo_no_hay_area():
    assert topic_area.active_topic_area() == ""
    topic_area.set_topic_area_provider(lambda: "Machine Learning")
    assert topic_area.active_topic_area() == "Machine Learning"

    def boom():
        raise RuntimeError("db caída")

    topic_area.set_topic_area_provider(boom)
    assert topic_area.active_topic_area() == ""


def test_main_registra_el_proveedor_de_generation():
    import main
    from generation.infrastructure import guardrails_store

    assert main.active_topic_area is guardrails_store.active_topic_area
    assert main.set_topic_area_provider is topic_area.set_topic_area_provider


@pytest.mark.parametrize("phase", PHASES)
def test_router_pasa_el_area_a_generate_resource(phase, monkeypatch):
    mod = importlib.import_module(f"llm.phases.{phase}_router")
    seen = {}

    def fake_generate(ph, n, concept, **kw):
        seen.update(kw)
        return SimpleNamespace(raw_json={}, html="<p>x</p>")

    monkeypatch.setattr(mod, "generate_resource", fake_generate)
    monkeypatch.setattr(mod, "retrieve_phase_context", lambda *a, **k: "")
    if hasattr(mod, "build_image_settings"):
        monkeypatch.setattr(mod, "build_image_settings", lambda *a, **k: {})
    topic_area.set_topic_area_provider(lambda: "Machine Learning")
    fn = getattr(mod, f"generate_{phase}_resource")
    req_cls = next(v for k, v in vars(mod).items() if k.startswith("Generate") and k.endswith("Request"))
    from starlette.requests import Request

    request = Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": ("1.1.1.1", 1), "server": ("t", 80), "scheme": "http"})
    out = fn(request, req_cls(resource_type=1, concept="Regresión"), SimpleNamespace(id="u"), None)
    assert seen["area"] == "Machine Learning" and out["html_content"] == "<p>x</p>"
