"""F1.1 — el nodo repair reintenta recursos fallidos una vez.

Antes: max_retries=0 → un recurso fallido moría y su fila quedaba "pending".
"""

import prometheus.nodes.repair as repair_mod
from prometheus.nodes.repair import _pending_failures, repair_node


def _state(errors, results=None):
    return {
        "prompt": "tema",
        "errors": errors,
        "results": results or [],
        "resource_configs": {"engage:1": {"num_panels": 7}},
    }


def test_pending_failures_skips_done_and_exhausted():
    state = _state(
        errors=[
            {"phase": "engage", "resource_type": 1, "error": "boom"},
            {"phase": "explain", "resource_type": 2, "error": "boom"},
            {"phase": "evaluate", "resource_type": 3, "error": "boom", "exhausted": True},
        ],
        results=[{"phase": "explain", "resource_type": 2, "html": "<html/>"}],
    )
    pending = _pending_failures(state)
    assert [(e["phase"], e["resource_type"]) for e in pending] == [("engage", 1)]


def test_repair_recovers_resource(monkeypatch):
    import prometheus.plans.generate as gen

    calls = {}

    def fake_generate(phase, rt, concept, *, resource_config=None, **kw):
        calls["config"] = resource_config
        return gen.ResourceResult("<html>reparado</html>", [], None)

    monkeypatch.setattr(gen, "generate_resource", fake_generate)
    monkeypatch.setattr(repair_mod, "_recursos_meta_for", lambda phase: {1: {"tipo": "Cómic"}})
    out = repair_node(_state([{"phase": "engage", "resource_type": 1, "error": "boom"}]))
    assert out["results"][0]["html"] == "<html>reparado</html>"
    assert out["errors"] == []
    assert calls["config"] == {"num_panels": 7}  # la config también llega al reintento


def test_repair_marks_exhausted_on_second_failure(monkeypatch):
    import prometheus.plans.generate as gen

    def failing_generate(*args, **kwargs):
        raise RuntimeError("boom otra vez")

    monkeypatch.setattr(gen, "generate_resource", failing_generate)
    out = repair_node(_state([{"phase": "engage", "resource_type": 1, "error": "boom"}]))
    assert out["results"] == []
    assert out["errors"][0]["exhausted"] is True


def test_repair_noop_without_failures():
    assert repair_node(_state([])) == {}
