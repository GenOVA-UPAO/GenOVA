"""Regressions for role keys and conservative state-flow checks."""

from copy import deepcopy
from xml.etree import ElementTree as ET

import pytest

from llm.images.sources.contract import ImageRequest
from llm.images.sources.diagram import DiagramSource
from llm.images.sources.diagram_semantics import prepare_diagram
from tests.test_diagram_source import render


@pytest.mark.parametrize(
    "names",
    [
        ["persona_origen_id", "persona_destino_id"],
        ["personaOrigenId", "personaDestinoId"],
        ["idPersonaOrigen", "id_persona_destino"],
        ["persona_id_origen", "persona_id_destino"],
        ["persona_emisor_principal_id", "persona_receptor_id"],
    ],
)
@pytest.mark.parametrize("marked", [False, True])
def test_role_keys_prevent_generic_fk_and_parallel_lines_remain_distinct(names, marked):
    data = {
        "tipo": "er",
        "nodos": [
            {"id": "p", "etiqueta": "Persona", "atributos": ["id (PK)"]},
            {
                "id": "v",
                "etiqueta": "Vínculo",
                "atributos": ["id (PK)"] + [n + (" (FK)" if marked else "") for n in names],
            },
        ],
        "aristas": [
            {"origen": "p", "destino": "v", "cardinalidad": "1:N", "etiqueta": role}
            for role in ["envía", "recibe"]
        ],
    }
    original = deepcopy(data)
    result, svg = render(data)
    repaired = result.meta["diagrama"]
    assert repaired["nodos"][1]["atributos"] == ["id (PK)"] + [n + " (FK)" for n in names]
    assert data == original and prepare_diagram(repaired) == repaired
    paths = [
        p.attrib["d"] for p in ET.fromstring(svg).findall("{*}path") if p.get("fill") == "none"
    ]
    assert len(paths) == len(set(paths)) == 2
    assert all(" Q " in path for path in paths)
    assert ">envía</text>" in svg and ">recibe</text>" in svg


def transaction():
    return {
        "tipo": "flujo",
        "nodos": [
            {"id": ident, "etiqueta": label}
            for ident, label in [
                ("a", "Activa"),
                ("p", "Parcialmente confirmada"),
                ("f", "Fallida"),
                ("b", "Abortada"),
                ("c", "Confirmada"),
            ]
        ],
        "aristas": [
            {"origen": a, "destino": b, "etiqueta": label}
            for a, b, label in [
                ("a", "p", "última operación"),
                ("p", "c", "confirmar"),
                ("a", "f", "error"),
                ("p", "f", "error"),
                ("f", "b", "deshacer"),
            ]
        ],
    }


def fetch(data, context="Ciclo de vida de una transacción"):
    return DiagramSource().fetch(ImageRequest("diagrama", context, diagrama=data))


def test_complete_transaction_accepted_without_mutation():
    data = transaction()
    original = deepcopy(data)
    assert fetch(data).meta["diagrama"]["aristas"] == data["aristas"]
    assert data == original


@pytest.mark.parametrize("origin", ["a", "p"])
def test_missing_known_error_transition_rejected(origin):
    data = transaction()
    data["aristas"] = [e for e in data["aristas"] if (e["origen"], e["destino"]) != (origin, "f")]
    assert fetch(data) is None


def test_nonfinal_state_without_exit_rejected():
    data = transaction()
    data["aristas"] = [e for e in data["aristas"] if e["origen"] != "f"]
    assert fetch(data) is None


@pytest.mark.parametrize("detail", ["", "; sin reintentos", "; no permitir reintentar"])
def test_final_outgoing_rejected_even_if_generated_title_requests_retry(detail):
    data = transaction()
    data["titulo"] = "Transacción con reintentos"
    data["aristas"].append({"origen": "b", "destino": "a", "etiqueta": "reintentar"})
    assert fetch(data, "Ciclo de vida de una transacción" + detail) is None


def test_explicit_retry_and_separate_terminal_state_accepted():
    data = transaction()
    data["aristas"].append({"origen": "b", "destino": "a", "etiqueta": "reintentar"})
    assert fetch(data, "Ciclo de vida de una transacción; permitir reintentos")
    data = transaction()
    data["nodos"].append({"id": "t", "etiqueta": "Terminada"})
    data["aristas"].extend([{"origen": i, "destino": "t"} for i in ["b", "c"]])
    assert fetch(data)
    data["aristas"].append({"origen": "b", "destino": "a", "etiqueta": "reintentar"})
    assert fetch(data) is None


def test_missing_failure_state_does_not_bypass_known_error_requirement():
    data = transaction()
    data["nodos"] = [n for n in data["nodos"] if n["id"] not in {"f", "b"}]
    data["aristas"] = [e for e in data["aristas"] if e["origen"] != "f" and e["destino"] != "f"]
    assert fetch(data) is None


def test_explicit_generic_state_semantics_and_ordinary_flow_not_rejected():
    data = {
        "tipo": "flujo",
        "nodos": [
            {"id": "a", "etiqueta": "Pendiente"},
            {"id": "b", "etiqueta": "Completado", "atributos": ["Estado final"]},
        ],
        "aristas": [{"origen": "a", "destino": "b"}],
    }
    assert fetch(data, "Estados de una tarea")
    data["aristas"].append({"origen": "b", "destino": "a"})
    assert fetch(data, "Estados de una tarea") is None
    assert fetch(data, "Estados de una tarea; reiniciar explícitamente")
    data["aristas"] = []
    assert fetch(data, "Estados de una tarea") is None
    assert fetch(data, "Proceso con dos salidas independientes")


def test_unknown_lifecycle_and_transaction_procedure_are_not_assumed_state_machines():
    data = {
        "tipo": "flujo",
        "nodos": [{"id": "a", "etiqueta": "Pendiente"}, {"id": "b", "etiqueta": "Aceptado"}],
        "aristas": [{"origen": "a", "destino": "b"}],
    }
    assert fetch(data, "Estados de un protocolo desconocido")
    assert fetch(data, "Procedimiento SQL para ejecutar una transacción")


def test_generated_title_cannot_authorize_retry_with_empty_description():
    data = transaction()
    data["titulo"] = "Estados de transacción con reintentos"
    data["aristas"].append({"origen": "b", "destino": "a", "etiqueta": "reintentar"})
    assert (
        DiagramSource().fetch(
            ImageRequest("diagrama", "", concept="Estados de transacción", diagrama=data)
        )
        is None
    )


def test_relacion_dada_en_ambos_sentidos_se_dibuja_una_vez():
    data = {
        "tipo": "er",
        "nodos": [
            {"id": "alumno", "etiqueta": "Alumno", "atributos": ["id_alumno (PK)"]},
            {"id": "nota", "etiqueta": "Calificación", "atributos": ["id_nota (PK)", "nota"]},
        ],
        "aristas": [
            {"origen": "alumno", "destino": "nota", "etiqueta": "tiene", "cardinalidad": "1:N"},
            {"origen": "nota", "destino": "alumno", "etiqueta": "pertenece", "cardinalidad": "N:1"},
        ],
    }
    out = prepare_diagram(data, "Modelo ER de notas")
    assert [(e["origen"], e["destino"], e["etiqueta"]) for e in out["aristas"]] == [
        ("alumno", "nota", "tiene")
    ]
    assert sum("(FK)" in a for a in out["nodos"][1]["atributos"]) == 1


def test_autorrelacion_con_dos_fk_de_rol_conserva_dos_lineas():
    data = {
        "tipo": "er",
        "nodos": [
            {"id": "usuario", "etiqueta": "Usuario", "atributos": ["id_usuario (PK)"]},
            {
                "id": "seguimiento",
                "etiqueta": "Seguimiento",
                "atributos": ["id (PK)", "usuario_origen_id (FK)", "usuario_destino_id (FK)"],
            },
        ],
        "aristas": [
            {
                "origen": "usuario",
                "destino": "seguimiento",
                "etiqueta": "sigue",
                "cardinalidad": "1:N",
            },
            {
                "origen": "seguimiento",
                "destino": "usuario",
                "etiqueta": "seguido por",
                "cardinalidad": "N:1",
            },
        ],
    }
    out = prepare_diagram(data, "Modelo ER de una red social")
    assert len(out["aristas"]) == 2
    assert sum("(FK)" in a for a in out["nodos"][1]["atributos"]) == 2


def test_relacion_inversa_con_etiqueta_larga_tambien_se_deduplica():
    data = {
        "tipo": "er",
        "nodos": [
            {"id": "alumno", "etiqueta": "Alumno", "atributos": ["id_alumno (PK)"]},
            {"id": "nota", "etiqueta": "Calificación", "atributos": ["id_nota (PK)", "nota"]},
        ],
        "aristas": [
            {"origen": "alumno", "destino": "nota", "etiqueta": "tiene", "cardinalidad": "1:N"},
            {
                "origen": "nota",
                "destino": "alumno",
                "etiqueta": "pertenece al alumno evaluado",
                "cardinalidad": "N:1",
            },
        ],
    }
    out = prepare_diagram(data, "Modelo ER de notas")
    assert [(e["origen"], e["destino"]) for e in out["aristas"]] == [("alumno", "nota")]
