"""F2.1/F2.4 — motor work-pool: fan-out por recurso, join, critic global."""

from langgraph.types import Send

import prometheus.engine.workpool as wp
from prometheus.engine.workpool import (
    build_workpool_graph,
    collect_node,
    fan_out,
    resource_worker,
)


def _state():
    return {
        "prompt": "tema",
        "phase_order": ["engage", "evaluate"],
        "phases": {
            "engage": [{"resource_type": 1, "resource_order": 0}],
            "evaluate": [
                {"resource_type": 1, "resource_order": 0},
                {"resource_type": 3, "resource_order": 1},
            ],
        },
        "resource_configs": {"evaluate:3": {"time_seconds": 60}},
        "llm_config": {},
        "enabled_models": [],
        "theme": {},
        "image_settings": {},
    }


def test_fan_out_one_send_per_resource():
    sends = fan_out(_state())
    assert len(sends) == 3
    assert all(isinstance(s, Send) and s.node == "resource_worker" for s in sends)
    items = [s.arg["work_item"] for s in sends]
    assert {(i["phase"], i["resource_type"]) for i in items} == {
        ("engage", 1),
        ("evaluate", 1),
        ("evaluate", 3),
    }
    # el contexto compartido viaja en cada Send
    assert sends[0].arg["resource_configs"] == {"evaluate:3": {"time_seconds": 60}}


def test_fan_out_empty_plan_goes_to_collect():
    sends = fan_out({"phase_order": [], "phases": {}})
    assert len(sends) == 1 and sends[0].node == "collect"


def test_worker_success_and_config(monkeypatch):
    import prometheus.engine.validate as val

    monkeypatch.setattr(val, "validate_and_improve", lambda html, *a, **k: (html, []))
    seen = {}

    def fake_dispatch(rt, concept, llm_config, enabled_models, theme, image_settings, per_config):
        seen["config"] = per_config
        return "<html>ok</html>"

    monkeypatch.setattr(wp, "_dispatch_for", lambda phase: (fake_dispatch, {3: {"tipo": "Desafío"}}))
    sends = fan_out(_state())
    payload = next(s.arg for s in sends if s.arg["work_item"]["resource_type"] == 3)
    out = resource_worker(payload)
    assert out["pool_results"][0]["html"] == "<html>ok</html>"
    assert out["pool_results"][0]["title"] == "Desafío"
    assert seen["config"] == {"time_seconds": 60}


def test_worker_failure_isolated(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("kaput")

    monkeypatch.setattr(wp, "_dispatch_for", lambda phase: (boom, {}))
    payload = fan_out(_state())[0].arg
    out = resource_worker(payload)
    assert out["errors"][0]["error"] == "kaput"
    assert "pool_results" not in out


def test_collect_feeds_critic_channels():
    pool = [{"phase": "engage", "resource_type": 1, "html": "<html/>"}]
    out = collect_node({"pool_results": pool, "errors": [], "phase_order": ["engage"]})
    assert out["current_phase_results"] == pool
    assert out["last_phase"] == "all"
    assert out["progress"] == 1


def test_workpool_graph_compiles():
    g = build_workpool_graph().compile()
    nodes = set(g.get_graph().nodes.keys())
    assert {"concierge", "resource_worker", "collect", "critic", "repair", "editor", "assemble"} <= nodes


def test_workpool_end_to_end_with_fake_dispatch(monkeypatch):
    """Invoke completo del grafo (sin checkpointer) con dispatch falso."""
    calls = []

    def fake_dispatch(rt, concept, llm_config, enabled_models, theme, image_settings, per_config):
        calls.append(rt)
        return f"<html>{rt}</html>"

    monkeypatch.setattr(wp, "_dispatch_for", lambda phase: (fake_dispatch, {}))
    # concierge/editor/assemble reales harían RAG/LLM/zip — reemplazos mínimos
    import prometheus.nodes.assemble as asm
    import prometheus.nodes.concierge as con
    import prometheus.nodes.editor as ed

    monkeypatch.setattr(con, "concierge_node", lambda s: {})
    monkeypatch.setattr(ed, "editor_node", lambda s: {})
    monkeypatch.setattr(asm, "assemble_node", lambda s: {"ova_status": "listo"})

    g = build_workpool_graph().compile()
    final = g.invoke(_state(), {"max_concurrency": 2})
    assert len(final["results"]) == 3  # el critic (disabled) commitea pool→results
    assert final["ova_status"] == "listo"
    assert sorted(calls) == [1, 1, 3]
