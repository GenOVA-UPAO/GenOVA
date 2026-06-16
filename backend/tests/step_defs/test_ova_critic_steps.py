"""EN-015 — BDD steps for the Crítico evaluator-optimizer loop.

Calls run_phase directly with a stub dispatch (returns fixed HTML) and
monkeypatches critique_resource so no real LLM calls happen.  No DB is needed:
job_id=None makes _persist_done and _touch_job no-ops.
"""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
# Set a dummy GROQ key to avoid the Groq client validation error on import
os.environ.setdefault("GROQ_API_KEY", "sk-test-dummy-key-for-unit-tests")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-long-enough-for-validation")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import importlib  # noqa: E402

from pytest_bdd import given, scenario, then, when  # noqa: E402

from config import settings  # noqa: E402

# Import runtime directly without going through prometheus.__init__
_runtime_mod = importlib.import_module("prometheus.runtime")
run_phase = _runtime_mod.run_phase

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE = os.path.join(_FEATURES, "setup", "EN-015_critico.feature")

_STUB_HTML = "<html><body>recurso mock</body></html>"
_STUB_HTML_V2 = "<html><body>recurso regenerado con feedback</body></html>"


def _make_state():
    return {
        "phases": {"engage": [{"resource_type": 1, "resource_order": 0}]},
        "current_phase_idx": 0,
        "prompt": "concepto de prueba",
        "llm_config": {},
        "enabled_models": [],
        "theme": {},
        "image_settings": {},
        "job_id": None,
        "progress": 0,
    }


def _dispatch(rt, concept, llm_config, enabled_models, theme, image_settings):
    return _STUB_HTML


# ---------------------------------------------------------------------------
# Scenario 1 — Crítico apagado
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Crítico apagado — sin cambio de comportamiento")
def test_critico_apagado():
    pass


@given('OVA_CRITIC está en "0"', target_fixture="ctx")
def critic_off(monkeypatch):
    monkeypatch.setattr(settings, "ova_critic", "0")
    return {}


@when("se ejecuta run_phase con un recurso mock", target_fixture="phase_result")
def run_phase_mock(ctx):
    return run_phase(_make_state(), "engage", _dispatch, {1: {"tipo": "Cómic"}})


@then("el result dict no incluye score ni critic_issues distintos de cero")
def no_score_no_issues(phase_result):
    results = phase_result.get("results", [])
    assert len(results) == 1
    r = results[0]
    # When critic is off, score=0 and critic_issues=[] (R5)
    assert r.get("score", 0) == 0
    assert r.get("critic_issues", []) == []


# ---------------------------------------------------------------------------
# Scenario 2 — Crítico acepta
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Crítico acepta un recurso de calidad")
def test_critico_acepta():
    pass


@given('OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "1"', target_fixture="ctx")
def critic_on_rounds_1(monkeypatch):
    monkeypatch.setattr(settings, "ova_critic", "1")
    monkeypatch.setattr(settings, "ova_reflection_rounds", 1)
    return {}


@given('el LLM del Crítico retorna veredicto "aceptar" con puntaje 85')
def critic_returns_accept(ctx, monkeypatch):
    import prometheus.critic as critic_mod

    monkeypatch.setattr(
        critic_mod,
        "critique_resource",
        lambda *a, **k: {"puntaje": 85, "problemas": [], "veredicto": "aceptar"},
    )


@then("el result dict incluye score=85 y critic_issues vacío")
def score_85_no_issues(phase_result):
    results = phase_result.get("results", [])
    assert len(results) == 1
    r = results[0]
    assert r["score"] == 85
    assert r["critic_issues"] == []


# ---------------------------------------------------------------------------
# Scenario 3 — Crítico re-genera
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Crítico re-genera un recurso defectuoso")
def test_critico_regenera():
    pass


@given('el LLM del Crítico retorna veredicto "revisar" puntaje 40 en primera llamada')
def critic_returns_revisar(ctx, monkeypatch):
    ctx["critique_calls"] = []

    def _critique(*a, **k):
        ctx["critique_calls"].append("call")
        if len(ctx["critique_calls"]) == 1:
            return {"puntaje": 40, "problemas": ["falta interactividad"], "veredicto": "revisar"}
        return {"puntaje": 78, "problemas": [], "veredicto": "aceptar"}

    import prometheus.critic as critic_mod
    import prometheus.refine as refine_mod

    monkeypatch.setattr(critic_mod, "critique_resource", _critique)
    # apply_feedback must also be patched so no LLM call happens during re-generation
    monkeypatch.setattr(
        refine_mod,
        "apply_feedback",
        lambda *a, **k: _STUB_HTML_V2,
    )


@given('el LLM del Crítico retorna veredicto "aceptar" puntaje 78 en segunda llamada')
def critic_returns_accept_second(ctx):
    # Already wired in the previous step via closure — no extra setup needed.
    pass


@then("el result dict incluye score=78 y critique fue llamado dos veces")
def score_78_two_calls(ctx, phase_result):
    results = phase_result.get("results", [])
    assert len(results) == 1
    assert results[0]["score"] == 78, f"expected 78, got {results[0]['score']}"
    assert len(ctx["critique_calls"]) == 2, f"expected 2 critique calls, got {len(ctx['critique_calls'])}"


# ---------------------------------------------------------------------------
# Scenario 4 — Rondas=0: evalúa pero no re-genera
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Crítico con rondas=0 evalúa pero no re-genera")
def test_critico_rondas_cero():
    pass


@given('OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "0"', target_fixture="ctx")
def critic_on_rounds_0(monkeypatch):
    monkeypatch.setattr(settings, "ova_critic", "1")
    monkeypatch.setattr(settings, "ova_reflection_rounds", 0)
    return {}


@given('el LLM del Crítico retorna veredicto "revisar" con puntaje 50')
def critic_returns_revisar_50(ctx, monkeypatch):
    ctx["critique_calls"] = []

    def _critique(*a, **k):
        ctx["critique_calls"].append("call")
        return {"puntaje": 50, "problemas": ["algo falla"], "veredicto": "revisar"}

    import prometheus.critic as critic_mod

    monkeypatch.setattr(critic_mod, "critique_resource", _critique)


@then("el Crítico fue invocado exactamente una vez")
def critique_once(ctx, phase_result):
    assert len(ctx["critique_calls"]) == 1, f"expected 1 call, got {len(ctx['critique_calls'])}"
    results = phase_result.get("results", [])
    assert len(results) == 1  # resource still accepted (R3/R4 — no abort)
    assert results[0]["score"] == 50


# ---------------------------------------------------------------------------
# Scenario 5 — Crítico falla
# ---------------------------------------------------------------------------

@scenario(FEATURE, "Crítico falla — recurso aceptado igual")
def test_critico_falla():
    pass



@given('OVA_CRITIC está en "1"', target_fixture="ctx")
def critic_on_only(monkeypatch):
    monkeypatch.setattr(settings, "ova_critic", "1")
    monkeypatch.setattr(settings, "ova_reflection_rounds", 1)
    return {}


@given("el LLM del Crítico lanza excepción")
def critic_raises(ctx, monkeypatch):
    import prometheus.critic as critic_mod

    monkeypatch.setattr(
        critic_mod,
        "critique_resource",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("critic_down")),
    )


@then("el recurso se acepta sin error y score=0")
def acepta_sin_error(phase_result):
    errors = phase_result.get("errors", [])
    results = phase_result.get("results", [])
    assert errors == [], f"unexpected errors: {errors}"
    assert len(results) == 1
    assert results[0]["score"] == 0
    assert results[0]["critic_issues"] == []
