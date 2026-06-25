"""LangGraph StateGraph for the OVA multi-agent generation pipeline.

Prometheus design: Concierge → PhaseAgents → Critic → Editor → Assemble.
Each phase agent generates ALL its resources in one bounded-parallel batch
and advances `current_phase_idx`. The Critic node always follows each phase;
when ova_critic=0 it is a passthrough (zero LLM calls). Routing after the
Critic walks phase_order until hitting editor.

Flow:  concierge → engage → critic → explore → critic → … → editor → assemble
"""

import logging

from langgraph.graph import END, START, StateGraph

from prometheus.engine.state import OvaGenerationState
from prometheus.nodes.assemble import assemble_node
from prometheus.nodes.concierge import concierge_node
from prometheus.nodes.critic import critic_node
from prometheus.nodes.editor import editor_node
from prometheus.nodes.elaborate import elaborate_node
from prometheus.nodes.engage import engage_node
from prometheus.nodes.evaluate import evaluate_node
from prometheus.nodes.explain import explain_node
from prometheus.nodes.explore import explore_node

logger = logging.getLogger(__name__)

_PHASES = ("engage", "explore", "explain", "elaborate", "evaluate")


def _route_next_phase(state: OvaGenerationState) -> str:
    phases = state.get("phase_order", [])
    idx = state.get("current_phase_idx", 0)
    if idx < len(phases):
        return phases[idx]
    return "editor"


def build_ova_graph():
    graph = StateGraph(OvaGenerationState)

    graph.add_node("concierge", concierge_node)
    graph.add_node("engage", engage_node)
    graph.add_node("explore", explore_node)
    graph.add_node("explain", explain_node)
    graph.add_node("elaborate", elaborate_node)
    graph.add_node("evaluate", evaluate_node)
    graph.add_node("critic", critic_node)
    graph.add_node("editor", editor_node)
    graph.add_node("assemble", assemble_node)

    graph.add_edge(START, "concierge")

    route_map = {**{p: p for p in _PHASES}, "editor": "editor"}
    # Concierge routes to the first phase (or editor if plan is empty).
    graph.add_conditional_edges("concierge", _route_next_phase, route_map)
    # Every phase node goes to critic (fixed — critic is a passthrough when disabled).
    for phase in _PHASES:
        graph.add_edge(phase, "critic")
    # Critic routes to the next phase or editor after evaluating/refining.
    graph.add_conditional_edges("critic", _route_next_phase, route_map)

    graph.add_edge("editor", "assemble")
    graph.add_edge("assemble", END)

    return graph


def invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None):
    from prometheus.engine.checkpointer import get_checkpointer

    graph = build_ova_graph()
    cp = checkpointer or get_checkpointer()
    compiled = graph.compile(checkpointer=cp)

    config = {"configurable": {"thread_id": thread_id}}
    return compiled.invoke(initial_state, config)
