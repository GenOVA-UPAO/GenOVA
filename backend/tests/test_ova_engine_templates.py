"""Contrato de TODAS las plantillas de ova_engine (se aplica a cada una al añadirla)."""

import copy

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs
from ova_engine.schema import validate

SPECS = sorted(all_specs().values(), key=lambda s: (s.phase, s.rt))
XSS = '<img src=x onerror="alert(1)"></script><script>alert(2)</script>'


def _param_sets(spec):
    """default + extremos de cada parámetro numérico/enumerado."""
    base = spec.resolve_params({})
    sets = [base]
    for p in spec.params:
        values = list(p.choices) if p.choices else [p.min, p.max]
        for v in values:
            if v is not None:
                sets.append({**base, p.name: v})
    return sets


def _poison(data):
    """Inyecta XSS en todos los strings del JSON (el LLM es entrada no confiable)."""
    if isinstance(data, dict):
        return {k: _poison(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_poison(v) for v in data]
    if isinstance(data, str):
        return data + XSS
    return data


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_sample_cumple_schema_y_renderiza(spec):
    for params in _param_sets(spec):
        data = spec.sample("Índices B-tree", params)
        assert validate(data, spec.schema(params)) == [], (spec.key, params)
        ctx = RenderContext("Índices B-tree", spec.phase, spec.rt, spec.title, params)
        html = spec.render(copy.deepcopy(data), ctx)
        assert "<upao-header" in html or "<upao-card" in html, "falta cabecera h1"
        assert "upao-complete" in html, "falta upao-complete (SCORM)"


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_texto_del_llm_siempre_escapado(spec):
    params = spec.resolve_params({})
    data = _poison(spec.sample("Índices B-tree", params))
    ctx = RenderContext("Índices B-tree", spec.phase, spec.rt, spec.title, params)
    html = spec.render(data, ctx)
    assert 'onerror="alert(1)"' not in html
    assert "<script>alert(2)" not in html


@pytest.mark.parametrize("spec", SPECS, ids=lambda s: s.key)
def test_prompt_no_pide_html(spec):
    params = spec.resolve_params({})
    p = spec.prompt("Índices B-tree", "", params)
    assert "Índices B-tree" in p
    assert "<html" not in p.lower()


def test_todas_las_plantillas_cargan():
    from ova_engine.registry import load_errors

    assert load_errors() == {}


def test_cobertura_de_los_49_recursos():
    """50 recursos 5E menos el podcast (engage 3, plantilla fija propia)."""
    expected = {f"{p}:{n}" for p in ("engage", "explore", "explain", "elaborate", "evaluate") for n in range(1, 11)}
    expected.discard("engage:3")
    assert expected - set(all_specs()) == set()
