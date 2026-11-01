"""explore_11: la comprobación de consignas no acepta subcadenas ni errores de signo."""

import json

import pytest
import quickjs

from ova_engine.contract import RenderContext
from ova_engine.registry import get_spec
from ova_engine.templates.explore_11 import ANSWER_JS


def _same(value: str, expected: str) -> bool:
    ctx = quickjs.Context()
    ctx.eval(ANSWER_JS)
    return ctx.eval(f"sameAnswer({json.dumps(value)}, {json.dumps(expected)})")


@pytest.mark.parametrize(
    ("value", "expected", "ok"),
    [
        ("a", "hacia abajo", False),
        ("hacia", "hacia abajo", False),
        ("Hacia abajo ", "hacia abajo", True),
        ("Intersección con el eje Y", "intersección con el eje y", True),
        ("-2", "2", False),
        ("2", "-2", False),
        ("2x", "2", False),
        ("2.0", "2", True),
        ("2,01", "2", True),
        ("-2 y 2", "2 y -2", True),
        ("2 y 2", "2 y -2", False),
    ],
)
def test_same_answer(value, expected, ok):
    assert _same(value, expected) is ok


def test_render_usa_la_comparacion_estricta():
    spec = get_spec("explore", 11)
    params = spec.resolve_params({})
    html = spec.render(spec.sample("Parábolas", params), RenderContext("Parábolas", spec.phase, spec.rt, spec.title, params))
    assert "function sameAnswer" in html
    assert "exp.includes(val)" not in html
