"""Regression tests for per-resource configs reaching the generation pipeline.

Bug (audit 2026-07-06, #8): `resource_configs` was missing from
OvaGenerationState, so LangGraph dropped the key from the initial state and
every user config silently fell back to defaults.
"""

from prometheus.engine.runtime import run_phase
from prometheus.engine.state import OvaGenerationState


def test_state_schema_declares_resource_configs():
    """LangGraph drops state keys missing from the TypedDict schema."""
    assert "resource_configs" in OvaGenerationState.__annotations__


def test_run_phase_forwards_per_resource_config_to_dispatch():
    received = {}

    def dispatch(rt, concept, llm_config, enabled_models, theme, image_settings, per_config):
        received[rt] = per_config
        return f"<html>{rt}</html>"

    state = {
        "prompt": "tema",
        "phases": {"engage": [{"resource_type": 1}, {"resource_type": 2}]},
        "resource_configs": {"engage:1": {"num_panels": 7}},
        "current_phase_idx": 0,
    }
    result = run_phase(state, "engage", dispatch, meta={1: {"tipo": "Cómic"}, 2: {"tipo": "SB"}})

    assert received[1] == {"num_panels": 7}
    assert received[2] == {}  # sin config → dict vacío, no None
    assert len(result["current_phase_results"]) == 2
    assert result["current_phase_errors"] == []
