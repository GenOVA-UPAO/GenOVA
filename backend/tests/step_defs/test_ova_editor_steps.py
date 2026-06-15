"""EN-016 — BDD steps for the Editor de Coherencia 5E.

Tests editor_node directly with a mock state. No DB required.
generar_texto is monkeypatched so no real LLM calls happen.
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("GROQ_API_KEY", "sk-test-dummy-key-for-unit-tests")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-long-enough-for-validation")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import json  # noqa: E402

from pytest_bdd import given, scenario, then, when  # noqa: E402

import prometheus.nodes.editor as editor_mod  # noqa: E402
from config import settings  # noqa: E402
from prometheus.nodes.editor import editor_node  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-016_editor.feature")


def _make_state(results=None, phase_order=None):
    return {
        "results": results or [],
        "phase_order": phase_order or ["engage", "explore", "explain", "elaborate", "evaluate"],
        "llm_config": {},
        "enabled_models": [],
        "prompt": "concepto de prueba",
        "job_id": None,
        "progress": 0,
    }


# ---------------------------------------------------------------------------
# Scenario 1 — Editor apagado — noop
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Editor apagado — noop")
def test_editor_apagado():
    pass


@given('OVA_EDITOR está en "0"', target_fixture="ctx")
def editor_off(monkeypatch):
    monkeypatch.setattr(settings, "ova_editor", "0")
    return {}


@given("el state tiene 2 recursos generados", target_fixture="state")
def state_2_recursos(ctx):
    return _make_state(results=[
        {"phase": "engage", "html": "<p>recurso engage</p>", "title": "Engage 1", "resource_type": 1},
        {"phase": "explore", "html": "<p>recurso explore</p>", "title": "Explore 1", "resource_type": 2},
    ])


@when("se ejecuta editor_node", target_fixture="result")
def run_editor_node(state):
    return editor_node(state)


@then("retorna dict vacío sin coherence_report")
def no_coherence_report(result):
    assert result == {}, f"Expected empty dict, got: {result}"
    assert "coherence_report" not in result


# ---------------------------------------------------------------------------
# Scenario 2 — Editor detecta inconsistencia y aplica parche
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Editor detecta inconsistencia y aplica parche")
def test_editor_aplica_parche():
    pass


@given('OVA_EDITOR está en "1"', target_fixture="ctx")
def editor_on(monkeypatch):
    monkeypatch.setattr(settings, "ova_editor", "1")
    return {}


@given('el state tiene resultados con texto "término X" en fase "explore"', target_fixture="state")
def state_con_termino_x(ctx):
    return _make_state(results=[
        {"phase": "engage", "html": "<p>hook inicial del OVA</p>", "title": "Engage 1", "resource_type": 1},
        {"phase": "explore", "html": "<p>explorar término X con ejemplos</p>", "title": "Explore 1", "resource_type": 2},
    ])


@given('el LLM mock retorna hallazgos y parches con reemplazo de "término X" por "término Y"')
def llm_mock_patch(ctx, state, monkeypatch):
    report = {
        "hallazgos": ["término X varía entre fases"],
        "parches": [{"phase": "explore", "buscar": "término X", "reemplazar": "término Y"}],
    }
    monkeypatch.setattr(
        editor_mod,
        "generar_texto",
        lambda *a, **k: json.dumps(report),
    )


@then("coherence_report incluye hallazgos y parches")
def report_has_findings(result):
    assert "coherence_report" in result, f"coherence_report missing from result: {result}"
    report = result["coherence_report"]
    assert len(report.get("hallazgos", [])) > 0, "Expected at least one hallazgo"
    assert len(report.get("parches", [])) > 0, "Expected at least one parche"


@then('el resultado de la fase "explore" ya no contiene "término X"')
def explore_no_term_x(state):
    # Patches are applied in-place on the state's results list
    explore_results = [r for r in state["results"] if r.get("phase") == "explore"]
    assert explore_results, "No explore results found in state"
    for r in explore_results:
        assert "término X" not in r["html"], (
            f"Expected 'término X' to be replaced, but found it in: {r['html']}"
        )


# ---------------------------------------------------------------------------
# Scenario 3 — Editor falla — continúa sin crash
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Editor falla — continúa sin crash")
def test_editor_falla():
    pass


# OVA_EDITOR = "1" reuse step already defined above (same text)
# "Given OVA_EDITOR está en "1"" is shared — pytest-bdd reuses by step text


@given("el LLM del Editor lanza excepción")
def llm_raises(ctx, monkeypatch):
    def _raise(*a, **k):
        raise RuntimeError("editor_llm_down")

    monkeypatch.setattr(editor_mod, "generar_texto", _raise)


@given("el state tiene 1 recurso generado", target_fixture="state")
def state_1_recurso(ctx):
    return _make_state(results=[
        {"phase": "engage", "html": "<p>recurso engage</p>", "title": "Engage 1", "resource_type": 1},
    ])


@then("retorna coherence_report vacío sin error")
def empty_report_no_crash(result):
    assert "coherence_report" in result, f"Expected coherence_report key, got: {result}"
    assert result["coherence_report"] == {}, (
        f"Expected empty coherence_report, got: {result['coherence_report']}"
    )
