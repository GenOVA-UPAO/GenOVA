"""Security, contract, geometry and textual SVG regressions (no network)."""

import base64
from copy import deepcopy
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

from llm.images.sources.contract import DIAGRAM_SCHEMA, ImageRequest
from llm.images.sources.diagram import DiagramSource, valid_diagram
from llm.images.sources.diagram_semantics import prepare_diagram

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
    count = 2 if kind == "comparacion" else 12
    data["nodos"] = [
        {
            "id": str(i),
            "etiqueta": "W" * 38 + f"{i:02}" if kind == "secuencia" else "W" * 40,
            "grupo": "g" * 30,
            "atributos": (
                ["id (PK)", *["W" * 39 + str(j) for j in range(6)]]
                if kind == "er"
                else ["W" * 40] * (5 if kind == "comparacion" else 8)
            ),
        }
        for i in range(count)
    ]
    data["aristas"] = [
        {"origen": str(i), "destino": str(i + 1), "etiqueta": "W" * 30, "cardinalidad": "1:N"}
        for i in range(count - 1)
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


def test_er_repair_keys_direction_and_attribute_names():
    data = fixture("er")
    data["nodos"][0]["atributos"] = ["nombre (completo)", "correo (Explicación: contacto)"]
    data["aristas"][0].update(origen="b", destino="a", cardinalidad="N:1")
    original = deepcopy(data)
    result, svg = render(data)
    repaired = result.meta["diagrama"]
    assert data == original
    assert repaired["nodos"][0]["atributos"] == ["id (PK)", "nombre", "correo"]
    assert "persona_id (FK)" in repaired["nodos"][1]["atributos"]
    assert repaired["aristas"][0]["origen"] == "a"
    assert repaired["aristas"][0]["cardinalidad"] == "1:N"
    assert prepare_diagram(repaired) == repaired
    assert "Explicación" not in svg


def test_er_join_entity_and_existing_foreign_key():
    data = fixture("er")
    data["aristas"][0]["cardinalidad"] = "N:M"
    result, _ = render(data)
    repaired = result.meta["diagrama"]
    assert len(repaired["nodos"]) == 3
    assert repaired["nodos"][2]["atributos"] == ["id (PK)", "persona_id (FK)", "prestamo_id (FK)"]
    assert len(repaired["aristas"]) == 2
    assert all(e["cardinalidad"] == "1:N" for e in repaired["aristas"])
    data = fixture("er")
    data["nodos"][1]["atributos"].append("persona_id")
    assert prepare_diagram(data)["nodos"][1]["atributos"].count("persona_id (FK)") == 1


def test_er_existing_join_and_capacity_fail_closed():
    data = fixture("er")
    data["nodos"].append({"id": "j", "etiqueta": "Asignación"})
    data["aristas"] += [
        {"origen": ident, "destino": "j", "cardinalidad": "1:N"} for ident in ("a", "b")
    ]
    data["aristas"][0]["cardinalidad"] = "N:M"
    repaired = render(data)[0].meta["diagrama"]
    assert len(repaired["nodos"]) == 3 and len(repaired["aristas"]) == 2
    data = fixture("er")
    data["nodos"][1]["atributos"] = [f"atributo{i}" for i in range(8)]
    assert DiagramSource().fetch(ImageRequest("diagrama", "ER", diagrama=data)) is None
    data = fixture("er")
    data["aristas"][0]["cardinalidad"] = "???"
    assert DiagramSource().fetch(ImageRequest("diagrama", "ER", diagrama=data)) is None


@pytest.mark.parametrize("kind", ["secuencia", "arbol", "flujo", "capas", "comparacion"])
def test_only_er_displays_cardinality_and_title_fallback(kind):
    data = fixture(kind)
    del data["titulo"]
    _, svg = render(data, "Título concreto")
    assert "1:N" not in svg and "Título concreto" in svg


def numeric_tree(title, labels, edges):
    return {
        "tipo": "arbol",
        "titulo": title,
        "nodos": [{"id": str(i), "etiqueta": label} for i, label in enumerate(labels)],
        "aristas": [{"origen": str(a), "destino": str(b)} for a, b in edges],
    }


@pytest.mark.parametrize(
    "title,labels,edges,accepted",
    [
        ("Árbol binario de búsqueda", ["8", "3", "10", "9"], [(0, 1), (0, 2), (1, 3)], False),
        ("Árbol binario de búsqueda", ["8", "3", "10", "6"], [(0, 1), (0, 2), (1, 3)], True),
        ("Árbol binario de búsqueda", ["8", "10", "3"], [(0, 1), (0, 2)], False),
        ("Min heap", ["1", "3", "2"], [(0, 1), (0, 2)], True),
        ("Min heap", ["3", "1", "2"], [(0, 1), (0, 2)], False),
        ("Max heap", ["3", "1", "2"], [(0, 1), (0, 2)], True),
        (
            "B-Tree orden 4",
            ["[20,40]", "[5,10]", "[25,30]", "[50,60]"],
            [(0, 1), (0, 2), (0, 3)],
            True,
        ),
        (
            "B-Tree orden 4",
            ["[20,40]", "[5,25]", "[25,30]", "[50,60]"],
            [(0, 1), (0, 2), (0, 3)],
            False,
        ),
        ("B-Tree orden 4", ["[20,40]", "[5,10]", "[50,60]"], [(0, 1), (0, 2)], False),
    ],
)
def test_numeric_invariants(title, labels, edges, accepted):
    data = numeric_tree(title, labels, edges)
    result = DiagramSource().fetch(ImageRequest("diagrama", title, diagrama=data))
    assert (result is not None) == accepted


def test_sequence_missing_actor_and_comparison_criteria():
    data = fixture("secuencia")
    data["aristas"][0]["destino"] = "mensaje"
    assert DiagramSource().fetch(ImageRequest("diagrama", "TCP", diagrama=data)) is None
    data = fixture("comparacion")
    data["nodos"][0]["atributos"] = ["Modelo: relacional", "Esquema: definido"]
    data["nodos"][1]["atributos"] = ["Esquema: flexible", "Modelo: documentos"]
    _, svg = render(data)
    assert "Criterio" in svg
    data["nodos"][1]["atributos"] = ["Otro: valor"]
    assert DiagramSource().fetch(ImageRequest("diagrama", "comparación", diagrama=data)) is None


def test_counter_cleanup_and_btree_cells():
    data = numeric_tree(
        "B-Tree orden 4", ["[20,40]", "[5,10]", "[25,30]", "[50,60]"], [(0, 1), (0, 2), (0, 3)]
    )
    data["nodos"][0]["atributos"] = ["Hijos: 2"]
    _, svg = render(data)
    assert "Hijos:" not in svg and "[20,40]" not in svg
    assert ">20</text>" in svg and ">40</text>" in svg


def test_er_direction_from_existing_fk_and_numeric_btree_attributes():
    data = fixture("er")
    data["nodos"][1]["atributos"].append("persona_id (FK)")
    data["aristas"][0]["cardinalidad"] = "N:1"
    repaired = render(data)[0].meta["diagrama"]
    assert repaired["aristas"][0]["origen"] == "a"
    assert repaired["aristas"][0]["cardinalidad"] == "1:N"
    assert "prestamo_id (FK)" not in repaired["nodos"][0]["atributos"]
    data = numeric_tree("B-Tree orden 4", ["40", "10", "25", "50"], [(0, 1), (0, 2), (0, 3)])
    for node, keys in zip(data["nodos"], ["20,40", "5,10", "25,30", "50,60"], strict=True):
        node["atributos"] = ["Claves: " + keys]
    assert render(data)[0] is not None


def test_normalization_rejects_false_first_normal_form():
    data = {
        "tipo": "flujo",
        "nodos": [{"id": "a", "etiqueta": "1FN", "atributos": ["No dependencias parciales"]}],
    }
    assert (
        DiagramSource().fetch(ImageRequest("diagrama", "Normalización 1FN a 3FN", diagrama=data))
        is None
    )
    data["nodos"][0]["atributos"] = ["Valores atómicos"]
    assert render(data, "Normalización")[0] is not None


def test_comparison_truncated_values_and_binary_search_missing_success():
    data = fixture("comparacion")
    data["nodos"][0]["atributos"] = ["Uso: archivos,"]
    data["nodos"][1]["atributos"] = ["Uso: vídeo"]
    assert DiagramSource().fetch(ImageRequest("diagrama", "TCP vs UDP", diagrama=data)) is None
    data = {
        "tipo": "flujo",
        "nodos": [{"id": "a", "etiqueta": "Comparar"}, {"id": "b", "etiqueta": "No encontrado"}],
        "aristas": [{"origen": "a", "destino": "b", "etiqueta": "No coincide"}],
    }
    assert (
        DiagramSource().fetch(ImageRequest("diagrama", "Búsqueda binaria", diagrama=data)) is None
    )


def test_btree_rejects_unequal_leaf_depth_and_too_many_keys():
    data = numeric_tree(
        "B-Tree orden 4", ["[20]", "[10]", "[30]", "[5]", "[15]"], [(0, 1), (0, 2), (1, 3), (1, 4)]
    )
    assert DiagramSource().fetch(ImageRequest("diagrama", "B-Tree", diagrama=data)) is None
    data = numeric_tree("B-Tree orden 4", ["[10,20,30,40]"], [])
    assert DiagramSource().fetch(ImageRequest("diagrama", "B-Tree", diagrama=data)) is None
