"""Reglas de contenido de la plantilla (`TemplateSpec.check`) en el reintento del texto."""

import copy
import json

from ova_engine import text as text_mod
from ova_engine.pipeline import generate_with_template
from ova_engine.registry import get_spec


def _quiz_sin_correcta(spec, params):
    good = spec.sample("Índices", params)
    bad = copy.deepcopy(good)
    for o in bad["preguntas"][0]["opciones"]:
        o["correcta"] = False
    return good, bad


def _router_con(answers, prompts):
    def fake_router(prompt, *a, **k):
        prompts.append(prompt)
        return json.dumps(answers.pop(0))

    return fake_router


def test_check_fuerza_reintento_si_no_hay_una_correcta(monkeypatch):
    spec = get_spec("evaluate", 1)
    params = spec.resolve_params({})
    good, bad = _quiz_sin_correcta(spec, params)
    prompts = []
    monkeypatch.setattr(text_mod, "_router", _router_con([bad, good], prompts))
    data = text_mod.generate_json("p", spec.schema(params), check=lambda d: spec.check(d, params))
    assert data == good
    assert "exactamente una opción con correcta=true" in prompts[1]


def test_check_que_sigue_fallando_no_tumba_el_recurso(monkeypatch):
    spec = get_spec("evaluate", 1)
    params = spec.resolve_params({})
    _, bad = _quiz_sin_correcta(spec, params)
    monkeypatch.setattr(text_mod, "_router", _router_con([bad, bad], []))
    assert text_mod.generate_json("p", spec.schema(params), check=lambda d: spec.check(d, params)) == bad


def test_pipeline_pasa_el_check_de_la_plantilla(monkeypatch):
    monkeypatch.setenv("OVA_CONTENT_REVIEW", "0")
    spec = get_spec("evaluate", 1)
    params = spec.resolve_params({})
    good, bad = _quiz_sin_correcta(spec, params)
    prompts = []
    monkeypatch.setattr(text_mod, "_router", _router_con([bad, good], prompts))
    _, data = generate_with_template(spec, "Índices")
    assert len(prompts) == 2
    assert data["preguntas"][0] == good["preguntas"][0]


def test_check_del_quiz_adaptativo_revisa_los_tres_niveles():
    spec = get_spec("evaluate", 11)
    params = spec.resolve_params({})
    data = spec.sample("Índices", params)
    assert spec.check(data, params) == []
    for o in data["banco"]["alto"][1]["opciones"]:
        o["correcta"] = True
    assert spec.check(data, params) == ["banco.alto: pregunta 2: debe tener exactamente una opción con correcta=true"]
