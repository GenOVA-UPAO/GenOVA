"""`/api/agents/<fase>/generate`: guardarraíl de entrada, tope del concepto y presupuesto."""

from __future__ import annotations

import importlib
import time
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request

import core.input_guardrail as input_guardrail

PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")


@pytest.fixture(autouse=True)
def _setup(monkeypatch):
    import main  # noqa: F401 — registra el comprobador real al importarse
    from core.rate_limit import limiter

    monkeypatch.setattr(limiter, "enabled", False)
    previous = input_guardrail._checker
    input_guardrail.set_input_guardrail(None)
    yield previous
    input_guardrail.set_input_guardrail(previous)


def _call(mod, phase, concept, user):
    request = Request({"type": "http", "method": "POST", "path": "/", "headers": [],
                       "client": ("1.1.1.1", 1), "server": ("t", 80), "scheme": "http"})
    req_cls = next(v for k, v in vars(mod).items() if k.startswith("Generate") and k.endswith("Request"))
    fn = getattr(mod, f"generate_{phase}_resource")
    return fn(request, req_cls(resource_type=1, concept=concept), user, None)


def _patch(mod, monkeypatch, seen):
    def fake_generate(ph, n, concept, **kw):
        seen.update(kw)
        return SimpleNamespace(raw_json={}, html="<p>x</p>")

    monkeypatch.setattr(mod, "generate_resource", fake_generate)
    monkeypatch.setattr(mod, "retrieve_phase_context", lambda *a, **k: "")
    monkeypatch.setattr(mod, "build_image_settings", lambda *a, **k: {})


@pytest.mark.parametrize("phase", PHASES)
def test_concepto_demasiado_largo_se_rechaza(phase):
    mod = importlib.import_module(f"llm.phases.{phase}_router")
    req_cls = next(v for k, v in vars(mod).items() if k.startswith("Generate") and k.endswith("Request"))
    with pytest.raises(ValidationError):
        req_cls(resource_type=1, concept="a" * 5000)


@pytest.mark.parametrize("phase", PHASES)
def test_guardarrail_bloquea_sin_generar(phase, monkeypatch):
    mod = importlib.import_module(f"llm.phases.{phase}_router")
    seen = {}
    _patch(mod, monkeypatch, seen)

    def block(prompt, user_id):
        return ("prompt_inappropriate_language", "Lenguaje inapropiado.") if "prohibido" in prompt else None

    input_guardrail.set_input_guardrail(block)
    with pytest.raises(HTTPException) as exc:
        _call(mod, phase, "tema prohibido", SimpleNamespace(id="u"))
    assert exc.value.status_code == 400
    assert exc.value.detail == "Lenguaje inapropiado."
    assert seen == {}


@pytest.mark.parametrize("phase", PHASES)
def test_pasa_presupuesto_y_autor(phase, monkeypatch):
    mod = importlib.import_module(f"llm.phases.{phase}_router")
    seen = {}
    _patch(mod, monkeypatch, seen)
    enabled = [{"provider": "groq", "model_id": "m"}]
    user = SimpleNamespace(id="u1", llm_settings={}, user_api_keys={}, enabled_models=enabled)
    before = time.monotonic()
    _call(mod, phase, "Regresión lineal", user)
    assert seen["deadline"] is not None and seen["deadline"] > before
    assert seen["llm_config"]["_owner_id"] == "u1"
    assert seen["enabled_models"] == enabled


def test_main_registra_el_guardarrail_de_generation(_setup):
    from generation.infrastructure.input_guardrail import prompt_refusal

    # `_setup` devuelve el comprobador que dejó registrado importar `main`.
    assert _setup is prompt_refusal


def test_prompt_refusal_traduce_el_rechazo(monkeypatch):
    from generation.domain.errors import PromptOffTopic
    from generation.infrastructure import input_guardrail as adapter

    def deny(self, prompt, user_id):
        raise PromptOffTopic()

    monkeypatch.setattr(adapter.InputGuardrailChecker, "assert_allowed", deny)
    code, message = adapter.prompt_refusal("x", "u")
    assert code == "prompt_off_topic" and message
