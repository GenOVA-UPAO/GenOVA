"""Feedback real de validadores, LLM simulado y presupuesto sin esperas ni red."""

import json
from copy import deepcopy

import httpx
import pytest
from structlog.testing import capture_logs

from llm.images.sources import diagram_generation as generation
from llm.images.sources.contract import ImageRequest
from llm.images.sources.diagram import diagram_rejection_reasons, valid_diagram
from llm.images.sources.diagram_selection import quality_rejection_reasons, validate_diagram_quality
from llm.images.sources.diagram_semantics import (
    prepare_diagram,
    prepare_diagram_with_reasons,
    semantic_rejection_reasons,
    semantic_valid,
)
from tests.test_diagram_quality import transaction as _transaction


def transaction():
    data = _transaction()
    data["nodos"][0]["atributos"] = ["Transacción en curso"]
    return data


@pytest.fixture
def request_diagram(monkeypatch):
    monkeypatch.delenv("OVA_DIAGRAM_RETRIES", raising=False)
    monkeypatch.setenv("OVA_DIAGRAM_TIMEOUT", "60")
    return ImageRequest("diagrama", "Estados habituales", concept="Ciclo de vida de una transacción")


@pytest.mark.parametrize(
    "data,reason",
    [
        (None, "debe ser object"),
        ({"tipo": "flujo"}, "falta $.nodos"),
        ({"tipo": "inventado", "nodos": []}, "$.tipo debe ser uno de"),
        ({"tipo": "flujo", "nodos": []}, "entre 1 y 12"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": "a" * 41}]}, "$.nodos[0].etiqueta supera"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": "\x00"}]}, "XML inválidos"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": "A"}], "extra": True}, "propiedades no permitidas"),
        ({"tipo": "flujo", "nodos": [{"id": "", "etiqueta": "A"}]}, "IDs vacíos"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": " "}]}, "etiquetas de nodos vacías"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": "A"}] * 2}, "IDs de nodos duplicados"),
        ({"tipo": "flujo", "nodos": [{"id": "a", "etiqueta": "A"}],
          "aristas": [{"origen": "a", "destino": "b"}]}, "referencias inexistentes"),
        ({"tipo": "arbol", "nodos": [{"id": "a", "etiqueta": "A"}],
          "aristas": [{"origen": "a", "destino": "a"}]}, "contiene un ciclo"),
        ({"tipo": "arbol", "nodos": [{"id": "a", "etiqueta": "A"}, {"id": "b", "etiqueta": "B"}],
          "aristas": [{"origen": "a", "destino": "b"}] * 2}, "varios padres"),
    ],
)
def test_schema_and_graph_reasons(data, reason):
    assert not valid_diagram(data)
    assert reason in " ".join(diagram_rejection_reasons(data))


@pytest.mark.parametrize(
    "diagram,concept,reason",
    [
        (None, "", "objeto JSON"),
        ({"tipo": "er"}, "Blockchain", "usa uno de"),
        ({"tipo": "capas", "nodos": []}, "", "añade los elementos"),
        ({"tipo": "capas", "nodos": [{"etiqueta": "Introducción"}]}, "", "índice de temario"),
        ({"tipo": "capas", "nodos": [{"etiqueta": "Cliente"}]}, "Blockchain", "incluye elementos"),
        ({"tipo": "flujo", "nodos": [{"etiqueta": s} for s in ["Clases", "Objetos", "Herencia"]]},
         "POO", "pasos o decisiones"),
        ({"tipo": "flujo", "nodos": [{"etiqueta": "Proceso"}],
          "aristas": [{"etiqueta": "relación"}]}, "Proceso", "acción o condición"),
    ],
)
def test_quality_reasons_preserve_legacy_contract(diagram, concept, reason):
    # POO clasifica como capas: forzar una plantilla de flujo para comprobar el rechazo de temario.
    template = "explain:08" if concept == "POO" else ""
    reasons = quality_rejection_reasons(diagram, concept, template_key=template)
    ok, legacy_reason = validate_diagram_quality(diagram, concept, template_key=template)
    assert not ok and legacy_reason
    assert reason in " ".join(reasons)


@pytest.mark.parametrize("problem,reason", [
    ("error", 'desde "Activa" hacia "Fallida"'),
    ("final", 'estado final "Abortada" tiene salidas'),
    ("exit", 'estado no final "Fallida" no tiene salida'),
])
def test_state_reasons(problem, reason):
    data = transaction()
    if problem == "error":
        data["aristas"] = [e for e in data["aristas"] if (e["origen"], e["destino"]) != ("a", "f")]
    elif problem == "final":
        data["aristas"].append({"origen": "b", "destino": "a"})
    else:
        data["aristas"] = [e for e in data["aristas"] if e["origen"] != "f"]
    assert not semantic_valid(data, "Estados de transacción")
    assert reason in " ".join(semantic_rejection_reasons(data, "Estados de transacción"))


@pytest.mark.parametrize("problem,reason", [
    ("cardinality", "Cardinalidad inválida"),
    ("conflict", "Cardinalidades contradictorias"),
    ("fk", "FK contradictorias"),
])
def test_prepare_reasons_and_no_mutation(problem, reason):
    data = {"tipo": "er", "nodos": [{"id": "a", "etiqueta": "A"}, {"id": "b", "etiqueta": "B"}],
            "aristas": [{"origen": "a", "destino": "b", "cardinalidad": "1:N"}]}
    if problem == "cardinality":
        data["aristas"][0]["cardinalidad"] = "?"
    elif problem == "conflict":
        data["aristas"].append({"origen": "a", "destino": "b", "cardinalidad": "1:1"})
    else:
        data["nodos"][0]["atributos"] = ["b_id (FK)"]
        data["nodos"][1]["atributos"] = ["a_id (FK)"]
    original = deepcopy(data)
    assert prepare_diagram(data) is None
    prepared, reasons = prepare_diagram_with_reasons(data)
    assert prepared is None and reason in " ".join(reasons)
    assert data == original


@pytest.mark.parametrize("kind,context,nodes,edges,reason", [
    ("comparacion", "", [{"id": "a", "etiqueta": "A"}], [], "exactamente dos"),
    ("comparacion", "", [{"id": "a", "etiqueta": "A", "atributos": ["Precio: 1"]},
                            {"id": "b", "etiqueta": "B", "atributos": ["Costo: 2"]}], [], "criterios"),
    ("flujo", "Normalización", [{"id": "a", "etiqueta": "1FN", "atributos": ["Sin dependencias parciales"]}], [], "1FN no elimina"),
    ("flujo", "Búsqueda binaria", [{"id": "a", "etiqueta": "No encontrado"}], [], "salida de éxito"),
    ("arbol", "BST", [{"id": "a", "etiqueta": "texto"}], [], "numéricas"),
    ("arbol", "BST", [{"id": "a", "etiqueta": "1"}, {"id": "b", "etiqueta": "2"}], [], "una raíz"),
    ("arbol", "BST", [{"id": "a", "etiqueta": "[1,2]"}], [], "una sola clave"),
    ("arbol", "Min heap", [{"id": "a", "etiqueta": "2"}, {"id": "b", "etiqueta": "1"}],
     [{"origen": "a", "destino": "b"}], "orden mínimo/máximo"),
    ("arbol", "BST", [{"id": "a", "etiqueta": "2"}, {"id": "b", "etiqueta": "3"}],
     [{"origen": "a", "destino": "b", "etiqueta": "izquierda"}], "fuera del rango"),
    ("arbol", "B-Tree orden 3", [{"id": "a", "etiqueta": "[1,2,3]"}], [], "cantidad de claves"),
    ("arbol", "B-Tree", [{"id": "a", "etiqueta": "2"}, {"id": "b", "etiqueta": "1"}],
     [{"origen": "a", "destino": "b"}], "un hijo más"),
])
def test_other_semantic_reasons(kind, context, nodes, edges, reason):
    data = {"tipo": kind, "nodos": nodes, "aristas": edges}
    assert not semantic_valid(data, context)
    assert reason in " ".join(semantic_rejection_reasons(data, context))


def test_second_attempt_corrects_semantics_and_logs(monkeypatch, request_diagram):
    bad = transaction()
    bad["aristas"] = [e for e in bad["aristas"] if (e["origen"], e["destino"]) != ("a", "f")]
    answers = iter([json.dumps(bad), json.dumps(transaction())])
    prompts = []

    def fake(prompt, **kwargs):
        prompts.append(prompt)
        return next(answers), "fake-diagram"

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    with capture_logs() as logs:
        result = generation.generate_diagram_for_request(request_diagram)
    assert result and result.meta["diagram_attempts"] == 2
    assert result.meta["diagram_model"] == "fake-diagram"
    assert len(prompts) == 2 and "Falta la transición de error" in prompts[1]
    assert json.dumps(bad) in prompts[1] and "completo corregido" in prompts[1]
    assert [log["event"] for log in logs] == ["diagram_rejected", "diagram_generated"]
    assert logs[0]["stage"] == "semántica" and logs[0]["attempt"] == 1
    assert logs[0]["diagram_type"] == "flujo" and logs[0]["reasons"]
    assert logs[1]["attempts"] == 2
    assert json.dumps(bad) not in str(logs)


@pytest.mark.parametrize("raw,stage,reason", [
    (None, "schema", "JSON inválido"),
    ("no es json", "schema", "JSON inválido"),
    ('{"tipo":"flujo"}', "schema", "falta $.nodos"),
    (json.dumps({"tipo": "er", "nodos": [{"id": "a", "etiqueta": "Activa"}]}), "calidad", "Tipo de diagrama"),
])
def test_rejected_stage_and_feedback(monkeypatch, request_diagram, raw, stage, reason):
    prompts = []

    def fake(prompt, **kwargs):
        prompts.append(prompt)
        return raw, "fake"

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    with capture_logs() as logs:
        assert generation.generate_diagram_for_request(request_diagram) is None
    assert len(prompts) == 2 and reason in prompts[1]
    if isinstance(raw, str):
        assert raw in prompts[1]
    assert len(logs) == 2 and all(log["stage"] == stage for log in logs)


@pytest.mark.parametrize("raises", [False, True])
def test_render_failure_is_retried_without_exception_payload(monkeypatch, request_diagram, raises):
    calls = []
    monkeypatch.setattr(generation, "generate_diagram_json", lambda *a, **kw: (json.dumps(transaction()), "fake"))

    class Source:
        def fetch(self, request):
            calls.append(request)
            if raises:
                raise ValueError("respuesta privada completa")
            return None

    with capture_logs() as logs:
        assert generation.generate_diagram_for_request(request_diagram, Source()) is None
    assert len(calls) == 2
    assert all(log["stage"] == "render" for log in logs)
    assert "respuesta privada" not in str(logs)


@pytest.mark.parametrize("configured,expected", [("1", 1), ("3", 3), ("0", 1), ("-2", 1), ("inválido", 2)])
def test_attempt_limit(monkeypatch, request_diagram, configured, expected):
    monkeypatch.setenv("OVA_DIAGRAM_RETRIES", configured)
    calls = []

    def fake(*args, **kwargs):
        calls.append(args)
        return "{}", "fake"

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    assert generation.generate_diagram_for_request(request_diagram) is None
    assert len(calls) == expected


def test_retry_json_is_truncated(monkeypatch, request_diagram):
    prompts = []
    raw = "x" * 4000 + "PRIVATE_TAIL"

    def fake(prompt, **kwargs):
        prompts.append(prompt)
        return raw, "fake"

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    with capture_logs() as logs:
        generation.generate_diagram_for_request(request_diagram)
    assert "[JSON recortado]" in prompts[1] and "PRIVATE_TAIL" not in prompts[1]
    assert raw[:100] not in str(logs)


@pytest.mark.parametrize("duration,expected_timeouts", [(120, [60]), (90, [60, 30])])
def test_total_budget_blocks_or_limits_next_attempt(monkeypatch, request_diagram, duration, expected_timeouts):
    monkeypatch.setenv("OVA_DIAGRAM_RETRIES", "5")
    now = [0]
    timeouts = []
    monkeypatch.setattr(generation.time, "monotonic", lambda: now[0])

    def fake(prompt, *, timeout, **kwargs):
        timeouts.append(timeout)
        now[0] += duration
        return "{}", "fake"

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    assert generation.generate_diagram_for_request(request_diagram) is None
    assert timeouts == expected_timeouts


@pytest.mark.parametrize("elapsed,expected", [(10, [60, 50]), (60, [60])])
def test_remote_fallback_shares_call_budget(monkeypatch, elapsed, expected):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-only")
    monkeypatch.setenv("OVA_DIAGRAM_TIMEOUT", "60")
    now = [0]
    timeouts = []
    monkeypatch.setattr(generation.time, "monotonic", lambda: now[0])

    def post(url, **kwargs):
        timeouts.append(kwargs["timeout"])
        if "openrouter" in url:
            now[0] += elapsed
            raise httpx.ReadTimeout("fallo simulado")
        return httpx.Response(200, json={"message": {"content": "{}"}}, request=httpx.Request("POST", url))

    monkeypatch.setattr(generation.httpx, "post", post)
    if elapsed == 60:
        with pytest.raises(httpx.ReadTimeout):
            generation.generate_diagram_json("prompt", model="vendor/model")
    else:
        generation.generate_diagram_json("prompt", model="vendor/model")
    assert timeouts == expected


@pytest.mark.parametrize("value", ["0", "-1", "nan", "inf", "inválido"])
def test_bad_timeout_uses_default(monkeypatch, value):
    monkeypatch.setenv("OVA_DIAGRAM_TIMEOUT", value)
    assert generation._diagram_timeout() == 60


def test_first_attempt_success_and_conservative_repair(monkeypatch):
    data = {"tipo": "er", "nodos": [{"id": "a", "etiqueta": "Tabla A"}, {"id": "b", "etiqueta": "Tabla B"}],
            "aristas": [{"origen": "a", "destino": "b", "cardinalidad": "1:N", "etiqueta": "contiene"}]}
    monkeypatch.setattr(generation, "generate_diagram_json", lambda *a, **kw: (json.dumps(data), "fake"))
    with capture_logs() as logs:
        result = generation.generate_diagram_for_request(ImageRequest("diagrama", "Modelo ER de tablas"))
    assert result and result.meta["diagram_attempts"] == 1
    assert "tabla_a_id (FK)" in result.meta["diagrama"]["nodos"][1]["atributos"]
    assert "atributos" not in data["nodos"][1]
    assert [log["event"] for log in logs] == ["diagram_generated"]


def test_generation_failure_is_bounded_and_logged(monkeypatch, request_diagram):
    calls = []

    def fake(*args, **kwargs):
        calls.append(args)
        raise httpx.ReadTimeout("contenido privado del proveedor")

    monkeypatch.setattr(generation, "generate_diagram_json", fake)
    with capture_logs() as logs:
        assert generation.generate_diagram_for_request(request_diagram) is None
    assert len(calls) == 2 and len(logs) == 2
    assert all(log["event"] == "diagram_rejected" for log in logs)
    assert "ReadTimeout" in str(logs) and "contenido privado" not in str(logs)
