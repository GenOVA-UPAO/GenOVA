"""LangGraph StateGraph for the OVA multi-agent generation pipeline.

Implements Prometheus Architectural Design: Concierge → PhaseAgents → Validate
→ [retry | next phase] → Assemble.

The graph is compiled once and invoked per job via `invoke_ova_generation()`.
"""

import logging

from langgraph.graph import END, StateGraph

from prometheus.nodes.assemble import assemble_node
from prometheus.nodes.concierge import concierge_node
from prometheus.nodes.elaborate import elaborate_node
from prometheus.nodes.engage import engage_node
from prometheus.nodes.evaluate import evaluate_node
from prometheus.nodes.explain import explain_node
from prometheus.nodes.explore import explore_node
from prometheus.nodes.validate import validate_node
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)


def _route_next_phase(state: OvaGenerationState) -> str:
    phases = state.get("phase_order", [])
    idx = state.get("current_phase_idx", 0)
    if idx < len(phases):
        return phases[idx]
    return "assemble"


def _check_validation(state: OvaGenerationState) -> str:
    phase = (
        state.get("phase_order", [])[state.get("current_phase_idx", 0)]
        if state.get("phase_order")
        else ""
    )
    results = state.get("results", [])
    errors = state.get("errors", [])
    total = state.get("total_resources", 0)
    done = len(results) + len(errors)

    last_error = len(errors) > 0 and (len(results) + len(errors)) > 0
    if last_error and len(results) == 0:
        if (state.get("current_phase_idx", 0) + 1) < len(state.get("phase_order", [])):
            return "next_phase"
        return "assemble"
    if done >= total:
        return "next_phase"
    return phase if phase in ("engage", "explore", "explain", "elaborate", "evaluate") else "engage"


def build_ova_graph():
    graph = StateGraph(OvaGenerationState)

    graph.add_node("concierge", concierge_node)
    graph.add_node("engage", engage_node)
    graph.add_node("explore", explore_node)
    graph.add_node("explain", explain_node)
    graph.add_node("elaborate", elaborate_node)
    graph.add_node("evaluate", evaluate_node)
    graph.add_node("validate", validate_node)
    graph.add_node("assemble", assemble_node)

    graph.set_entry_point("concierge")

    graph.add_conditional_edges(
        "concierge",
        _route_next_phase,
        {
            "engage": "engage",
            "explore": "explore",
            "explain": "explain",
            "elaborate": "elaborate",
            "evaluate": "evaluate",
            "assemble": "assemble",
        },
    )

    for phase in ("engage", "explore", "explain", "elaborate", "evaluate"):
        graph.add_edge(phase, "validate")

    graph.add_conditional_edges(
        "validate",
        _check_validation,
        {
            "engage": "engage",
            "explore": "explore",
            "explain": "explain",
            "elaborate": "elaborate",
            "evaluate": "evaluate",
            "next_phase": "concierge",
            "assemble": "assemble",
        },
    )

    graph.add_edge("assemble", END)

    return graph


def invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None):
    from prometheus.checkpointer import get_checkpointer

    graph = build_ova_graph()
    cp = checkpointer or get_checkpointer()
    compiled = graph.compile(checkpointer=cp)

    config = {"configurable": {"thread_id": thread_id}}
    return compiled.invoke(initial_state, config)
