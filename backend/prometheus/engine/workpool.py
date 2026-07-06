"""Motor work-pool (F2.1/F2.4) — un worker por recurso, sin barreras de fase.

Flujo:
    concierge → [Send("resource_worker", ctx+item) × N] → collect
              → critic (pass global único) → repair → editor → assemble

Diferencias con el motor por fases (graph.py):
- Los N recursos corren en el mismo superstep de LangGraph; la concurrencia la
  limita `max_concurrency` del invoke (settings.ova_gen_concurrency), no un
  ThreadPool por fase → wall-clock ≈ recurso más lento, no suma de fases.
- El critic corre UNA vez sobre todos los recursos (era 5 pasadas, una por
  fase) y sigue siendo quien commitea a `results`.
- El nodo repair y el editor se reutilizan tal cual.

Se activa con OVA_ENGINE=workpool (default: "phases", el motor legacy).
"""

import logging

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from prometheus.engine.runtime import _persist_done, _touch_job
from prometheus.engine.state import OvaGenerationState

logger = logging.getLogger(__name__)

_CTX_KEYS = (
    "prompt",
    "llm_config",
    "enabled_models",
    "theme",
    "image_settings",
    "resource_configs",
    "job_id",
)


def _dispatch_for(phase: str):
    from prometheus.nodes.repair import _dispatch_for as repair_dispatch_for

    return repair_dispatch_for(phase)


def fan_out(state: OvaGenerationState) -> list[Send]:
    """Un Send por recurso del plan. Lista vacía → directo a collect."""
    ctx = {k: state.get(k) for k in _CTX_KEYS}
    sends = []
    for phase in state.get("phase_order", []):
        for item in state.get("phases", {}).get(phase, []):
            sends.append(
                Send(
                    "resource_worker",
                    {**ctx, "work_item": {"phase": phase, **item}},
                )
            )
    if not sends:
        return [Send("collect", {})]
    _touch_job(state.get("job_id"))
    return sends


def resource_worker(payload: dict) -> dict:
    """Genera UN recurso. Éxito → pool_results (+persistencia incremental);
    fallo → errors (el nodo repair reintenta después del join)."""
    item = payload["work_item"]
    phase, rt = item["phase"], item["resource_type"]
    dispatch, meta = _dispatch_for(phase)
    per_config = (payload.get("resource_configs") or {}).get(f"{phase}:{rt}", {})
    job_id = payload.get("job_id")
    try:
        html = dispatch(
            rt,
            payload.get("prompt", ""),
            payload.get("llm_config", {}),
            payload.get("enabled_models", []),
            payload.get("theme", {}),
            payload.get("image_settings", {}),
            per_config,
        )
    except Exception as exc:  # noqa: BLE001 — aislar el fallo de un recurso
        logger.exception("workpool: %s:%s failed", phase, rt)
        return {"errors": [{"phase": phase, "resource_type": rt, "error": str(exc)}]}

    # F2.3 — evaluator-optimizer: checklist estructural + feedback dirigido.
    from prometheus.engine.validate import validate_and_improve

    html, remaining = validate_and_improve(
        html,
        phase,
        rt,
        payload.get("prompt", ""),
        payload.get("llm_config", {}),
        payload.get("enabled_models", []),
        payload.get("theme", {}),
    )

    title = (meta.get(rt) or {}).get("tipo", "")
    _persist_done(job_id, phase, rt, html)
    _touch_job(job_id)
    return {
        "pool_results": [
            {"phase": phase, "html": html, "resource_type": rt, "title": title}
        ]
    }


def collect_node(state: OvaGenerationState) -> dict:
    """Join del fan-out: expone lo generado como current_phase_results para que
    el critic (pass global) refine/commitee a `results` sin duplicar."""
    pool = state.get("pool_results", [])
    return {
        "current_phase_results": pool,
        "current_phase_errors": state.get("errors", []),
        "last_phase": "all",
        # El router legacy del critic no corre aquí, pero mantener el idx al
        # final del plan deja el estado coherente para checkpoints/telemetría.
        "current_phase_idx": len(state.get("phase_order", [])),
        "progress": len(pool),
    }


def build_workpool_graph():
    from prometheus.nodes.assemble import assemble_node
    from prometheus.nodes.concierge import concierge_node
    from prometheus.nodes.critic import critic_node
    from prometheus.nodes.editor import editor_node
    from prometheus.nodes.repair import repair_node

    graph = StateGraph(OvaGenerationState)
    graph.add_node("concierge", concierge_node)
    graph.add_node("resource_worker", resource_worker)
    graph.add_node("collect", collect_node)
    graph.add_node("critic", critic_node)
    graph.add_node("repair", repair_node)
    graph.add_node("editor", editor_node)
    graph.add_node("assemble", assemble_node)

    graph.add_edge(START, "concierge")
    graph.add_conditional_edges("concierge", fan_out, ["resource_worker", "collect"])
    graph.add_edge("resource_worker", "collect")
    graph.add_edge("collect", "critic")
    graph.add_edge("critic", "repair")
    graph.add_edge("repair", "editor")
    graph.add_edge("editor", "assemble")
    graph.add_edge("assemble", END)
    return graph
