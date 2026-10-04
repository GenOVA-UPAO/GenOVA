"""Domain-independent regressions for diagram repair and generation instructions."""

from copy import deepcopy
from xml.etree import ElementTree as ET

import pytest

from llm.images.sources.contract import ImageRequest
from llm.images.sources.diagram import DiagramSource
from llm.images.sources.diagram_semantics import prepare_diagram, requested_criteria
from tests.test_diagram_source import fixture, render


@pytest.mark.parametrize(
    "name",
    [
        "id_persona",
        "persona_id",
        "personaId",
        "idPersona",
        "id_persona_origen",
        "persona_id_destino",
        "personaIdEmisor",
        "idPersonaReceptor",
    ],
)
@pytest.mark.parametrize("marked", [False, True])
def test_fk_conventions_and_roles_do_not_duplicate(name, marked):
    data = fixture("er")
    data["nodos"][1]["atributos"] = ["id (PK)", name + (" (FK)" if marked else "")]
    data["aristas"][0]["cardinalidad"] = "N:1"
    original = deepcopy(data)
    repaired = render(data)[0].meta["diagrama"]
    assert repaired["nodos"][1]["atributos"] == ["id (PK)", name + " (FK)"]
    assert repaired["aristas"][0]["origen"] == "a"
    assert prepare_diagram(repaired) == repaired and data == original


def test_fk_matching_requires_boundaries_and_marks_all_roles():
    data = fixture("er")
    data["nodos"][1]["atributos"] = [
        "id (PK)",
        "persona_id_origen",
        "idPersonaDestino",
        "id_personal",
    ]
    repaired = prepare_diagram(data)
    assert repaired["nodos"][1]["atributos"] == [
        "id (PK)",
        "persona_id_origen (FK)",
        "idPersonaDestino (FK)",
        "id_personal",
    ]
    data["nodos"][1]["atributos"] = ["id_personal"]
    assert "persona_id (FK)" in prepare_diagram(data)["nodos"][1]["atributos"]


@pytest.mark.parametrize("self_relation", [False, True])
def test_multiple_er_roles_have_distinct_paths_and_visible_labels(self_relation):
    data = fixture("er")
    data["aristas"] = [
        {
            "origen": "a",
            "destino": "a" if self_relation else "b",
            "cardinalidad": "1:N",
            "etiqueta": role,
        }
        for role in ["origen", "destino"]
    ]
    result, svg = render(data)
    assert [e["etiqueta"] for e in result.meta["diagrama"]["aristas"]] == ["origen", "destino"]
    paths = [
        e.attrib["d"]
        for e in ET.fromstring(svg).findall("{*}path")
        if e.attrib.get("fill") == "none"
    ]
    assert len(paths) == len(set(paths)) == 2
    assert ">origen</text>" in svg and ">destino</text>" in svg
    for text in ET.fromstring(svg).findall("{*}text"):
        assert 0 <= int(text.attrib["y"]) < result.meta["height"]


def test_reflexive_many_to_many_has_two_foreign_keys():
    data = fixture("er")
    data["aristas"] = [{"origen": "a", "destino": "a", "cardinalidad": "N:M", "etiqueta": "enlaza"}]
    repaired = render(data)[0].meta["diagrama"]
    join = repaired["nodos"][-1]
    assert len([a for a in join["atributos"] if "FK" in a]) == 2
    assert len(repaired["aristas"]) == 2


def test_unrequested_isolated_entities_removed_without_using_generated_title():
    data = fixture("er")
    data["titulo"] = "Biblioteca con Ejemplar"
    data["nodos"] += [{"id": "c", "etiqueta": "Ejemplar"}, {"id": "d", "etiqueta": "Auditoría"}]
    result = render(data, "Persona y Préstamo; incluir Auditoría aislada")[0]
    assert [n["id"] for n in result.meta["diagrama"]["nodos"]] == ["a", "b", "d"]
    data = {"tipo": "er", "nodos": [{"id": "a", "etiqueta": "Inventado"}]}
    assert DiagramSource().fetch(ImageRequest("diagrama", "Tema solicitado", diagrama=data)) is None


@pytest.mark.parametrize("fk", [False, True])
def test_contradictory_cardinalities_need_original_fk_evidence(fk):
    data = fixture("er")
    data["aristas"].append(
        {"origen": "a", "destino": "b", "cardinalidad": "1:1", "etiqueta": "otra"}
    )
    if fk:
        data["nodos"][1]["atributos"].append("idPersona (FK)")
    repaired = prepare_diagram(data)
    if fk:
        assert len(repaired["aristas"]) == 1 and repaired["aristas"][0]["cardinalidad"] == "1:N"
    else:
        assert repaired is None


def test_duplicate_actors_merge_normalized_labels_and_redirect_ordered_messages():
    data = {
        "tipo": "secuencia",
        "nodos": [
            {"id": "c", "etiqueta": "Coordinador"},
            {"id": "p", "etiqueta": "Participante"},
            {"id": "c2", "etiqueta": " coordinadór "},
            {"id": "p2", "etiqueta": "PARTICIPANTE"},
        ],
        "aristas": [
            {"origen": "c2", "destino": "p2", "etiqueta": "solicita"},
            {"origen": "p", "destino": "c", "etiqueta": "responde"},
            {"origen": "c", "destino": "c2", "etiqueta": "registra"},
        ],
    }
    original = deepcopy(data)
    result, svg = render(data, "Protocolo abstracto")
    repaired = result.meta["diagrama"]
    assert len(repaired["nodos"]) == 2 and len(repaired["aristas"]) == 3
    assert [(e["origen"], e["destino"]) for e in repaired["aristas"]] == [
        ("c", "p"),
        ("p", "c"),
        ("c", "c"),
    ]
    assert "3. registra" in svg and data == original and prepare_diagram(repaired) == repaired


def test_comparison_filters_to_requested_criteria_and_rejects_over_five():
    data = fixture("comparacion")
    for node in data["nodos"]:
        node["atributos"] = ["Memoria: compartida", "Rendimiento: variable", "Lenguaje: inventado"]
    result, svg = render(data, "Comparación; criterios: memoria y rendimiento")
    assert len(result.meta["diagrama"]["nodos"][0]["atributos"]) == 2
    assert "inventado" not in svg
    assert requested_criteria(
        "Dos columnas; conexión, fiabilidad, orden y casos de uso; comentarios"
    ) == ["conexion", "fiabilidad", "orden", "casos_de_uso"]
    for node in data["nodos"]:
        node["atributos"] = [f"Criterio {i}: valor" for i in range(6)]
    assert DiagramSource().fetch(ImageRequest("diagrama", "Comparación", diagrama=data)) is None
    assert (
        DiagramSource().fetch(ImageRequest("diagrama", "Criterios: memoria", diagrama=data)) is None
    )


def test_state_cycles_and_failure_transitions_preserved():
    data = {
        "tipo": "flujo",
        "nodos": [
            {"id": i, "etiqueta": label}
            for i, label in [("a", "Activa"), ("b", "Fallida"), ("c", "Reintentar")]
        ],
        "aristas": [
            {"origen": "a", "destino": "b", "etiqueta": "fallo"},
            {"origen": "b", "destino": "c", "etiqueta": "sí"},
            {"origen": "c", "destino": "a", "etiqueta": "reiniciar"},
        ],
    }
    result, svg = render(data, "Ciclo de estados")
    assert result.meta["diagrama"]["aristas"] == data["aristas"]
    assert ">fallo</text>" in svg


def test_single_merged_actor_long_self_message_fits_canvas():
    data = fixture("secuencia")
    data["nodos"][1]["etiqueta"] = data["nodos"][0]["etiqueta"]
    data["aristas"][0]["etiqueta"] = "W" * 30
    result, svg = render(data)
    for text in ET.fromstring(svg).findall("{*}text"):
        assert int(text.attrib["x"]) + len(text.text or "") * 16 <= result.meta["width"]
