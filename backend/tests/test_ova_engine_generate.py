"""generate_resource → plan «template» cuando hay plantilla (ova_engine)."""

import prometheus.plans.generate as gen
from core.config import settings
from ova_engine import text as text_mod
from ova_engine.registry import get_spec
from prometheus.plans.plan_map import TEMPLATE, TWO_STEP, degraded_plan, plan_for


def test_plan_template_si_hay_plantilla(monkeypatch):
    monkeypatch.setattr(settings, "ova_engine_templates", True)
    assert plan_for("engage", 1) == TEMPLATE
    assert degraded_plan("engage", 1, TEMPLATE) == TWO_STEP


def test_generate_resource_usa_texto_y_plantilla(monkeypatch):
    monkeypatch.setattr(settings, "ova_engine_templates", True)
    monkeypatch.setattr(settings, "llm_fake", False)
    spec = get_spec("engage", 1)
    calls = []

    def fake_router(prompt, max_tokens, *a):
        calls.append(prompt)
        import json

        return json.dumps(spec.sample("Índices", spec.resolve_params({})))

    monkeypatch.setattr(text_mod, "_router", fake_router)
    r = gen.generate_resource("engage", 1, "Índices")
    assert len(calls) == 1  # una sola llamada: solo texto, sin paso HTML ni refinado
    assert "<upao-comic-panel" in r.html and "UPAO Components v" in r.html
    assert r.defects == []


def test_texto_invalido_reintenta_con_errores(monkeypatch):
    spec = get_spec("engage", 1)
    params = spec.resolve_params({})
    good = spec.sample("X", params)
    answers = ['{"titulo": 1}', __import__("json").dumps(good)]
    prompts = []

    def fake_router(prompt, *a):
        prompts.append(prompt)
        return answers.pop(0)

    monkeypatch.setattr(text_mod, "_router", fake_router)
    assert text_mod.generate_json("p", spec.schema(params)) == good
    assert "no cumplía el schema" in prompts[1]
