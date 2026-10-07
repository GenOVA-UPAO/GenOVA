"""Las plantillas no usan emoji como iconos: dependen de la fuente del sistema
(sin ella salen como un cuadro vacío) y no siguen el tema de paquete. Los iconos
son SVG en línea (`ova_engine.icons`).

Se permiten los símbolos tipográficos de texto (✓ ✗ → ← ↓ ↕ ↺ ● ◆ ■ ▲): son glifos
de presentación textual que traen DejaVu, Noto Symbols y Segoe UI Symbol. El resto
del rango pictográfico (y ▶ ◀, que algunas plataformas dibujan como emoji) falla.
"""

import json
import re
from pathlib import Path

import pytest

from ova_engine.pipeline import render_resource
from ova_engine.registry import all_specs
from ova_engine.templates import __path__ as _templates_path

FIXTURES = sorted((Path(__file__).parent / "fixtures" / "ova_engine").glob("*_[0-9][0-9].json"))

_PICTOGRAPHIC = re.compile(
    "["
    "⌀-⏿"  # técnicos: ⏱ ⏮ ⏭ ⏸ ⌚
    "☀-✒✔-✖✘-➿"  # misceláneos y dingbats, salvo ✓ (2713) y ✗ (2717)
    "⬀-⯿"  # flechas y estrellas: ⭐
    "▶◀"  # ▶ ◀
    "\U0001f000-\U0001faff"  # pictogramas, emoticonos, transporte
    "️‍"  # selector de emoji y unión de secuencias
    "]"
)


def _found(text: str) -> list[str]:
    return sorted({f"U+{ord(c):04X} {c}" for c in _PICTOGRAPHIC.findall(text)})


@pytest.mark.parametrize("path", FIXTURES, ids=lambda p: p.stem)
def test_recurso_renderizado_sin_emoji(path):
    fx = json.loads(path.read_text(encoding="utf-8"))
    phase, rt = path.stem.rsplit("_", 1)
    spec = all_specs()[f"{phase}:{int(rt)}"]
    html = render_resource(spec, fx["data"], fx["concept"], fx["params"])
    assert _found(html) == []


def test_codigo_de_plantillas_sin_emoji():
    """También el JS que pinta estados después de interactuar, que no sale en el HTML inicial."""
    root = Path(_templates_path[0])
    sources = list(root.glob("*.py")) + [root.parent / "html.py", root.parent / "icons.py"]
    offenders = {p.name: _found(p.read_text(encoding="utf-8")) for p in sources}
    assert {k: v for k, v in offenders.items() if v} == {}


def test_componentes_upao_sin_emoji():
    js = Path(__file__).parents[1] / "llm" / "ova_components" / "upao_components.js"
    assert _found(js.read_text(encoding="utf-8")) == []


def test_icono_inexistente_falla_pronto():
    from ova_engine.icons import icon

    with pytest.raises(KeyError):
        icon("no-existe")
