"""evaluate_11: los ids del banco son únicos aunque el LLM repita los suyos entre niveles."""

import json
import re

from ova_engine.contract import RenderContext
from ova_engine.registry import get_spec


def test_ids_unicos_y_con_prefijo_de_nivel():
    spec = get_spec("evaluate", 11)
    params = spec.resolve_params({})
    data = spec.sample("Normalización", params)
    for preguntas in data["banco"].values():
        for n, q in enumerate(preguntas, 1):
            q["id"] = f"q{n}"
    html = spec.render(data, RenderContext("Normalización", spec.phase, spec.rt, spec.title, params))
    raw = re.search(r'<script type="application/json" id="ova-data">(.*?)</script>', html, re.S).group(1)
    banco = json.loads(raw)["banco"]
    ids = [q["id"] for lvl, preguntas in banco.items() for q in preguntas]
    assert len(ids) == len(set(ids)) == sum(len(v) for v in data["banco"].values())
    assert all(q["id"].startswith(f"{lvl}_") for lvl, preguntas in banco.items() for q in preguntas)
