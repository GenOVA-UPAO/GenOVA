"""F3 — fuente única de planes, dispatch por intención y señales→beliefs."""

import prometheus.engine.validate as val
import prometheus.engine.workpool as wp
import prometheus.plans.plan_map as pm
from prometheus.engine.bdi import deliberar, generate_desires
from prometheus.engine.workpool import collect_node, fan_out, resource_worker
from prometheus.plans.plan_map import degraded_plan, plan_for


def test_plan_for_matches_real_plans():
    assert plan_for("engage", 3) == "podcast"
    assert plan_for("engage", 6) == "direct_code"  # F1.3 noticia
    assert plan_for("engage", "10") == "direct_code"
    assert plan_for("explain", 2) == "direct_code"
    assert plan_for("evaluate", 1) == "two_step"


def test_bdi_intentions_carry_real_plan_types():
    desires = generate_desires(
        {"engage": [{"resource_type": 3, "resource_order": 0}],
         "evaluate": [{"resource_type": 1, "resource_order": 0}]}
    )
    intentions = deliberar(desires, {"rag_quality": 0.5, "model_capability": 1.0})
    plans = {(i["phase"], i["resource_type"]): i["plan_type"] for i in intentions}
    assert plans[("engage", 3)] == "podcast"
    assert plans[("evaluate", 1)] == "two_step"


def test_degraded_plan_only_with_codigo_template():
    assert degraded_plan("evaluate", 1, "two_step") is None  # quiz sin [codigo.1]
    assert degraded_plan("explain", 4, "two_step") is None
    assert degraded_plan("engage", 6, "two_step") == "direct_code"
    assert degraded_plan("engage", 6, "direct_code") is None  # ya degradado


def test_fan_out_uses_intentions_plan():
    state = {
        "phase_order": ["engage"],
        "phases": {"engage": [{"resource_type": 6, "resource_order": 0}]},
        "intentions": [
            {"phase": "engage", "resource_type": 6, "plan_type": "two_step", "committed": True}
        ],
    }
    sends = fan_out(state)
    assert sends[0].arg["work_item"]["plan_type"] == "two_step"  # la intention manda


def test_worker_dispatches_by_plan_and_emits_signal(monkeypatch):
    seen = {}

    def fake_dispatch(plan, phase, rt, *a, **k):
        seen["plan"] = plan
        return "<html>ok</html>"

    monkeypatch.setattr(pm, "dispatch_by_plan", fake_dispatch)
    monkeypatch.setattr(val, "validate_and_improve", lambda html, *a, **k: (html, []))
    monkeypatch.setattr(wp, "_recursos_meta_for", lambda phase: {})
    out = resource_worker(
        {"work_item": {"phase": "engage", "resource_type": 6, "plan_type": "direct_code"}}
    )
    assert seen["plan"] == "direct_code"
    sig = out["worker_signals"][0]
    assert sig["ok"] is True and sig["plan"] == "direct_code" and "seconds" in sig


def test_collect_aggregates_signals_into_beliefs():
    out = collect_node(
        {
            "pool_results": [{"phase": "engage", "resource_type": 6, "html": "<x/>"}],
            "errors": [],
            "phase_order": ["engage"],
            "beliefs": {"rag_quality": 0.7},
            "worker_signals": [
                {"phase": "engage", "resource_type": 6, "ok": True, "plan": "direct_code", "seconds": 12.0},
                {"phase": "evaluate", "resource_type": 1, "ok": False, "plan": "two_step",
                 "seconds": 30.0, "error_class": "RateLimitError"},
            ],
        }
    )
    b = out["beliefs"]
    assert b["rag_quality"] == 0.7  # conserva creencias previas
    assert b["avg_resource_seconds"] == 12.0
    assert b["failures_by_error"] == {"RateLimitError": 1}
    assert b["failed_resources"] == [
        {"phase": "evaluate", "resource_type": 1, "plan": "two_step"}
    ]
