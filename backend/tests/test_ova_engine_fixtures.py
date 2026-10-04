"""Cassettes del motor: cada fixture grabada con un LLM real cumple el schema de su
plantilla y renderiza sin errores (grabar con scripts/ova_engine_record.py)."""

import json
from pathlib import Path

import pytest

from ova_engine.contract import RenderContext
from ova_engine.registry import all_specs
from ova_engine.schema import validate

FIXTURES = sorted((Path(__file__).parent / "fixtures" / "ova_engine").glob("*_[0-9][0-9].json"))


@pytest.mark.parametrize("path", FIXTURES, ids=lambda p: p.stem)
def test_fixture_cumple_schema_y_renderiza(path):
    fx = json.loads(path.read_text(encoding="utf-8"))
    phase, rt = path.stem.rsplit("_", 1)
    spec = all_specs()[f"{phase}:{int(rt)}"]
    params = fx["params"]
    assert validate(fx["data"], spec.schema(params)) == []
    ctx = RenderContext(fx["concept"], spec.phase, spec.rt, spec.title, params)
    html = spec.render(fx["data"], ctx)
    assert "<upao-header" in html or "<upao-card" in html
    assert "upao-complete" in html


def test_hay_fixtures_de_los_49_recursos():
    stems = {p.stem for p in FIXTURES}
    expected = {f"{s.phase}_{s.rt:02d}" for s in all_specs().values()}
    assert expected - stems == set()
