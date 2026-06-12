"""LangGraph StateGraph for the OVA multi-agent generation pipeline.

Prometheus design: Concierge → PhaseAgents → Assemble. Each phase agent
generates ALL its resources in one bounded-parallel batch (Fase 2) and advances
`current_phase_idx`, so routing simply walks phase_order until it hits assemble.
HTML validation/repair runs inside each generation plan (llm.html_validator),
so the old per-resource `validate` loop node is no longer needed.

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
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)

_PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")


def _route_next_phase(state: OvaGenerationState) -> str:
    phases = state.get("phase_order", [])
    idx = state.get("current_phase_idx", 0)
    if idx < len(phases):
        return phases[idx]
    return "assemble"


def build_ova_graph():
    graph = StateGraph(OvaGenerationState)

    graph.add_node("concierge", concierge_node)
    graph.add_node("engage", engage_node)
    graph.add_node("explore", explore_node)
    graph.add_node("explain", explain_node)
    graph.add_node("elaborate", elaborate_node)
    graph.add_node("evaluate", evaluate_node)
    graph.add_node("assemble", assemble_node)

    graph.set_entry_point("concierge")

    route_map = {**{p: p for p in _PHASES}, "assemble": "assemble"}
    # Concierge builds the plan; every phase node advances current_phase_idx and
    # re-routes to the next phase (or assemble) via the same router.
    graph.add_conditional_edges("concierge", _route_next_phase, route_map)
    for phase in _PHASES:
        graph.add_conditional_edges(phase, _route_next_phase, route_map)

    graph.add_edge("assemble", END)

    return graph


def invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None):
    from prometheus.checkpointer import get_checkpointer

    graph = build_ova_graph()
    cp = checkpointer or get_checkpointer()
    compiled = graph.compile(checkpointer=cp)

    config = {"configurable": {"thread_id": thread_id}}
    return compiled.invoke(initial_state, config)
