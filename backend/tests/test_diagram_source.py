"""Security, contract, geometry and textual SVG regressions (no network)."""

import base64
from copy import deepcopy
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

from llm.images.sources.contract import DIAGRAM_SCHEMA, ImageRequest
from llm.images.sources.diagram import DiagramSource, valid_diagram

KINDS = DIAGRAM_SCHEMA["properties"]["tipo"]["enum"]
SNAPSHOTS = Path(__file__).parent / "snapshots" / "diagram"


def fixture(kind):
    return {
        "tipo": kind,
        "titulo": "Biblioteca: relación y préstamo",
        "nodos": [
            {
                "id": "a",
                "etiqueta": "Persona",
                "grupo": "Usuarios",
                "atributos": ["id (PK)", "Nombre completo"],
            },
            {
                "id": "b",
                "etiqueta": "Préstamo",
                "grupo": "Operaciones",
                "atributos": ["id (PK)", "Fecha de devolución"],
            },
        ],
        "aristas": [{"origen": "a", "destino": "b", "etiqueta": "realiza", "cardinalidad": "1:N"}],
    }


def render(data, description="Una persona realiza varios préstamos."):
    result = DiagramSource().fetch(ImageRequest("diagrama", description, diagrama=data))
    assert result is not None
    return result, base64.b64decode(result.data_uri.split(",", 1)[1]).decode()


@pytest.mark.parametrize("kind", KINDS)
def test_snapshots_and_determinism(kind):
    result, svg = render(fixture(kind))
    assert svg == (SNAPSHOTS / f"{kind}.svg").read_text()
    assert render(deepcopy(fixture(kind)))[1] == svg
    reordered = dict(reversed(list(fixture(kind).items())))
    assert render(reordered)[1] == svg
    assert result.source == "diagrama" and result.credit is None


@pytest.mark.parametrize("invalid", [None, {}, [], "diagrama", {"tipo": "er", "nodos": []}])
def test_missing_and_wrong_types(invalid):
    assert DiagramSource().fetch(ImageRequest("diagrama", "Descripción", diagrama=invalid)) is None


@pytest.mark.parametrize(
    "mutation",
    [
        lambda d: d.update(extra="no"),
        lambda d: d["nodos"][0].update(extra="no"),
        lambda d: d["aristas"][0].update(extra="no"),
        lambda d: d["nodos"][1].update(id="a"),
        lambda d: d["nodos"][0].update(id=""),
        lambda d: d["nodos"][0].update(etiqueta=" "),
        lambda d: d["aristas"][0].update(destino="missing"),
        lambda d: d["nodos"][0].update(etiqueta="x" * 41),
        lambda d: d["nodos"][0].update(etiqueta="bad\x00xml"),
        lambda d: d.update(titulo="x" * 81),
        lambda d: d.update(nodos=d["nodos"] * 7),
        lambda d: d.update(aristas=d["aristas"] * 17),
        lambda d: d["nodos"][0].update(atributos=["a"] * 9),
        lambda d: d["aristas"][0].update(cardinalidad="x" * 11),
    ],
)
def test_reject_invalid_contract(mutation):
    data = fixture("er")
    mutation(data)
    assert not valid_diagram(data)


def test_malicious_text_is_inert():
    data = fixture("er")
    data["nodos"][0]["etiqueta"] = '<script>alert("x")</script>'
    data["nodos"][0]["id"] = '" onload="alert(1)'
    data["aristas"][0]["origen"] = data["nodos"][0]["id"]
    _, svg = render(data, '<foreignObject> & " <script>')
    root = ET.fromstring(svg)
    assert "&lt;script&gt;" in svg
    assert root.find("{*}desc").text == '<foreignObject> & " <script>'
    assert all(
        element.tag.split("}")[-1]
        in {"svg", "title", "desc", "defs", "marker", "path", "rect", "text"}
        for element in root.iter()
    )
    assert all(
        not key.startswith("on") and "href" not in key for el in root.iter() for key in el.attrib
    )


def test_tree_cycles_and_multiple_parents():
    data = fixture("arbol")
    data["aristas"].append({"origen": "b", "destino": "a"})
    assert not valid_diagram(data)
    data = fixture("arbol")
    data["aristas"] *= 2
    assert not valid_diagram(data)


def contrast(a, b):
    def luminance(color):
        rgb = [int(color[i : i + 2], 16) / 255 for i in (1, 3, 5)]
        rgb = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
        return sum(v * weight for v, weight in zip(rgb, (0.2126, 0.7152, 0.0722), strict=True))

    light, dark = sorted([luminance(a), luminance(b)], reverse=True)
    return (light + 0.05) / (dark + 0.05)


@pytest.mark.parametrize("kind", KINDS)
def test_accessibility_and_maximum_geometry(kind):
    data = fixture(kind)
    data["nodos"] = [
        {"id": str(i), "etiqueta": "W" * 40, "grupo": "g" * 30, "atributos": ["W" * 40] * 8}
        for i in range(12)
    ]
    data["aristas"] = [
        {"origen": str(i), "destino": str(i + 1), "etiqueta": "W" * 30, "cardinalidad": "W" * 10}
        for i in range(11)
    ]
    result, svg = render(data)
    root = ET.fromstring(svg)
    assert root.attrib["role"] == "img"
    assert root.attrib["aria-labelledby"] == "title desc"
    assert root.find("{*}title").text and root.find("{*}desc").text
    assert contrast("#172B4D", "#FFFFFF") >= 4.5
    assert contrast("#172B4D", "#F5F8FC") >= 4.5
    assert contrast("#0A3D91", "#F5F8FC") >= 3
    boxes = list(result.meta["boxes"].values())
    for x, y, w, h in boxes:
        assert (
            x >= 0 and y >= 0 and x + w <= result.meta["width"] and y + h <= result.meta["height"]
        )
    for i, (x, y, w, h) in enumerate(boxes):
        for xx, yy, ww, hh in boxes[i + 1 :]:
            assert x + w <= xx or xx + ww <= x or y + h <= yy or yy + hh <= y
    for text in root.findall("{*}text"):
        assert 0 <= int(text.attrib["y"]) < result.meta["height"]
        assert int(text.attrib["x"]) + len(text.text or "") * 16 <= result.meta["width"]


def test_self_loop_and_bad_description():
    data = fixture("flujo")
    data["aristas"] = [{"origen": "a", "destino": "a", "etiqueta": "reintentar"}] * 16
    result, _ = render(data)
    assert result.meta["boxes"]["a"][3] >= 32 * 60
    assert DiagramSource().fetch(ImageRequest("diagrama", "\x00", diagrama=data)) is None
