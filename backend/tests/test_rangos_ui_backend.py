"""Los rangos de `params_schema` (Param) coinciden con los de la UI de configuración de recursos."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from ova_engine.registry import all_specs
from ova_engine.schema import validate

UI = Path(__file__).resolve().parents[2] / "frontend/src/features/ova-workspace/lib/resource-config.ts"

pytestmark = pytest.mark.skipif(not UI.exists(), reason="sin el frontend en el árbol (p. ej. imagen del backend)")

_ENTRY = re.compile(r'"(\w+:\d+)":\s*\[(.*?)\n?\s*\],', re.S)
_FIELD = re.compile(r'\b[NV]\(\s*"(\w+)"\s*,\s*[^,]+?,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,')


def _ui() -> dict[str, dict[str, tuple[int, int, int]]]:
    out: dict[str, dict[str, tuple[int, int, int]]] = {}
    for key, body in _ENTRY.findall(UI.read_text(encoding="utf-8")):
        fields = {k: (int(a), int(b), int(c)) for k, a, b, c in _FIELD.findall(body)}
        if fields:
            out[key] = fields
    return out


def test_el_parser_de_la_ui_lee_las_entradas():
    ui = _ui()
    assert ui["explain:2"] == {"num_sections": (2, 5, 3)}
    assert ui["explain:3"] == {"num_nodes": (5, 10, 7)}
    assert len(ui) >= 40


# Sin plantilla en ova_engine (el texto lo escribe el LLM) o sin configuración en la UI.
_UI_SIN_PLANTILLA = {"engage:3"}
_PLANTILLA_SIN_UI = {"explore:11"}
# Ajustes internos de la plantilla que la UI no expone (no se recortan: la UI no los envía).
_INTERNOS = {"evaluate:11": {"num_per_level", "mastery_threshold"}}


def test_todos_los_recursos_tienen_los_mismos_rangos_en_backend_y_ui():
    ui = _ui()
    specs = all_specs()
    errores = []
    for key in sorted(set(ui) - set(specs) - _UI_SIN_PLANTILLA):
        errores.append(f"{key}: la UI lo configura pero no hay plantilla")
    for key, spec in sorted(specs.items()):
        numericos = {p.name: p for p in spec.params if p.min is not None}
        if key not in ui:
            if key not in _PLANTILLA_SIN_UI:
                errores.append(f"{key}: sin configuracion en resource-config.ts")
            continue
        for name in sorted(set(ui[key]) - set(numericos)):
            errores.append(f"{key}.{name}: la UI lo envia y el backend no lo conoce")
        for name, p in sorted(numericos.items()):
            if name not in ui[key]:
                if name not in _INTERNOS.get(key, ()):
                    errores.append(f"{key}.{name}: el backend lo tiene y la UI no")
            elif (p.min, p.max, p.default) != ui[key][name]:
                errores.append(f"{key}.{name}: backend {(p.min, p.max, p.default)} != ui {ui[key][name]}")
    assert not errores, "\n".join(errores)


def test_sample_y_render_en_los_extremos_de_todos_los_rangos():
    """Cada plantilla genera datos y HTML con cualquier valor del rango de la UI (min, def, max)."""
    from ova_engine.pipeline import render_resource

    ui = _ui()
    for key, spec in sorted(all_specs().items()):
        for name, (lo, hi, df) in ui.get(key, {}).items():
            for v in sorted({lo, df, hi}):
                params = spec.resolve_params({name: v})
                assert params[name] == v, (key, name, v)  # sin recortar
                data = spec.sample("Índices", params)
                assert validate(data, spec.schema(params)) == [], (key, name, v)
                assert render_resource(spec, data, "Índices", params), (key, name, v)


@pytest.mark.parametrize(
    "key,var,item,rng",
    [("explain:2", "num_sections", "secciones", range(2, 6)), ("explain:3", "num_nodes", "nodos", range(5, 11))],
)
def test_explain_2_y_3_sample_y_render_en_todo_el_rango(key, var, item, rng):
    from ova_engine.pipeline import render_resource

    spec = all_specs()[key]
    for n in rng:
        params = spec.resolve_params({var: n})
        assert params[var] == n  # sin recortar al rango viejo
        data = spec.sample("Índices", params)
        assert len(data[item]) == n
        assert render_resource(spec, data, "Índices", params)
