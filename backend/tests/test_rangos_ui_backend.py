"""Los rangos de `params_schema` (Param) coinciden con los de la UI de configuración de recursos."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from ova_engine.registry import all_specs

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


@pytest.mark.parametrize("key", ["explain:2", "explain:3"])
def test_explain_2_y_3_alineados_con_la_ui(key):
    ui = _ui()[key]
    specs = {k: s for k, s in all_specs().items()}
    for p in specs[key].params:
        assert (p.min, p.max, p.default) == ui[p.name], (key, p.name)


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
