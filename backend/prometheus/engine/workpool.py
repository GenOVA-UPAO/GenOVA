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

Motor único desde 2026-07-10 (benchmark F2: 6:21/20 recursos, 0 fallos, vs
~30min del motor por fases eliminado).
"""

import functools

import structlog
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from prometheus.engine.job_trace import job_trace
from prometheus.engine.runtime import _persist_done, _touch_job
from prometheus.engine.state import OvaGenerationState

logger = structlog.get_logger(__name__)

_CTX_KEYS = (
    "prompt",
    "llm_config",
    "enabled_models",
    "theme",
    "image_settings",
    "resource_configs",
    "job_id",
    # Contexto RAG recuperado por el concierge: sin esta clave los workers
    # generaban ignorando el material subido por el usuario.
    "rag_context",
)


def _recursos_meta_for(phase: str) -> dict:
    from prometheus.nodes.repair import _recursos_meta_for as repair_recursos_meta_for

    return repair_recursos_meta_for(phase)


def fan_out(state: OvaGenerationState) -> list[Send]:
    """Un Send por recurso del plan, con el plan_type de su intention (F3.3)."""
    from prometheus.plans.plan_map import plan_for

    ctx = {k: state.get(k) for k in _CTX_KEYS}
    plan_by_key = {
        f"{i.get('phase')}:{i.get('resource_type')}": i.get("plan_type")
        for i in state.get("intentions", [])
        if i.get("committed", True)
    }
    sends = []
    for phase in state.get("phase_order", []):
        for item in state.get("phases", {}).get(phase, []):
            rt = item["resource_type"]
            plan = plan_by_key.get(f"{phase}:{rt}") or plan_for(phase, rt)
            sends.append(
                Send(
                    "resource_worker",
                    {**ctx, "work_item": {"phase": phase, **item, "plan_type": plan}},
                )
            )
    if not sends:
        return [Send("collect", {})]
    _touch_job(state.get("job_id"))
    return sends


def resource_worker(payload: dict) -> dict:
    """Genera UN recurso según su intention.plan_type (F3.3). Éxito →
    pool_results (+persistencia incremental); fallo → errors (repair reintenta
    tras el join). Emite worker_signals para la revisión de creencias (F3.1)."""
    import time

    from prometheus.plans.generate import generate_resource
    from prometheus.plans.plan_map import plan_for

    item = payload["work_item"]
    phase, rt = item["phase"], item["resource_type"]
    plan = item.get("plan_type") or plan_for(phase, rt)
    per_config = (payload.get("resource_configs") or {}).get(f"{phase}:{rt}", {})
    job_id = payload.get("job_id")
    started = time.monotonic()
    try:
        result = generate_resource(
            phase,
            rt,
            payload.get("prompt", ""),
            plan=plan,
            llm_config=payload.get("llm_config", {}),
            enabled_models=payload.get("enabled_models", []),
            theme=payload.get("theme", {}),
            image_settings=payload.get("image_settings", {}),
            resource_config=per_config,
            contexto=payload.get("rag_context", "") or "",
        )
    except Exception as exc:  # noqa: BLE001 — aislar el fallo de un recurso
        logger.exception("workpool: resource failed", phase=phase, resource_type=rt)
        return {
            "errors": [{"phase": phase, "resource_type": rt, "error": str(exc), "plan": plan}],
            "worker_signals": [
                {
                    "phase": phase,
                    "resource_type": rt,
                    "ok": False,
                    "plan": plan,
                    "seconds": round(time.monotonic() - started, 1),
                    "error_class": type(exc).__name__,
                }
            ],
        }

    # F2.3 — el refinamiento (evaluator-optimizer) ya corrió dentro de
    # generate_resource como compuerta única; aquí solo leemos los defectos
    # estructurales restantes para el routing a repair.
    html, remaining = result.html, result.defects
    if remaining:
        # Defectos estructurales sin resolver (sin _scormComplete, placeholder,
        # esqueleto…): el alumno no podría completar el recurso. Va por la ruta
        # de error para que repair lo reintente en vez de cerrarse como done.
        logger.warning(
            "workpool: resource kept structural defects after improve rounds",
            phase=phase,
            resource_type=rt,
            defects=remaining,
        )
        return {
            "errors": [
                {
                    "phase": phase,
                    "resource_type": rt,
                    "error": "defectos estructurales sin resolver: " + "; ".join(remaining),
                    "plan": plan,
                }
            ],
            "worker_signals": [
                {
                    "phase": phase,
                    "resource_type": rt,
                    "ok": False,
                    "plan": plan,
                    "seconds": round(time.monotonic() - started, 1),
                    "error_class": "StructuralDefects",
                }
            ],
        }

    meta = _recursos_meta_for(phase)
    title = (meta.get(rt) or {}).get("tipo", "")
    _persist_done(job_id, phase, rt, html)
    _touch_job(job_id)
    return {
        "pool_results": [{"phase": phase, "html": html, "resource_type": rt, "title": title}],
        "worker_signals": [
            {
                "phase": phase,
                "resource_type": rt,
                "ok": True,
                "plan": plan,
                "seconds": round(time.monotonic() - started, 1),
            }
        ],
    }


def collect_node(state: OvaGenerationState) -> dict:
    """Join del fan-out: expone lo generado para el pass global del critic y
    agrega las señales de los workers a las creencias del job (F3.1)."""
    pool = state.get("pool_results", [])
    signals = state.get("worker_signals", [])
    durations = [s["seconds"] for s in signals if s.get("ok")]
    failures = [s for s in signals if not s.get("ok")]
    error_classes: dict[str, int] = {}
    for s in failures:
        key = s.get("error_class", "?")
        error_classes[key] = error_classes.get(key, 0) + 1
    beliefs = {
        **state.get("beliefs", {}),
        "avg_resource_seconds": (round(sum(durations) / len(durations), 1) if durations else None),
        "failed_resources": [
            {"phase": s["phase"], "resource_type": s["resource_type"], "plan": s.get("plan")}
            for s in failures
        ],
        "failures_by_error": error_classes,
        "accumulated_errors": len(failures),
    }
    return {
        "beliefs": beliefs,
        "current_phase_results": pool,
        "current_phase_errors": state.get("errors", []),
        "last_phase": "all",
        # El router legacy del critic no corre aquí, pero mantener el idx al
        # final del plan deja el estado coherente para checkpoints/telemetría.
        "current_phase_idx": len(state.get("phase_order", [])),
        "progress": len(pool),
    }


def _traced(fn):
    """Envuelve un nodo para reagrupar sus llamadas LLM bajo el trace del job
    (LangSmith). No-op si el tracing está apagado."""

    @functools.wraps(fn)
    def wrapper(arg, *a, **kw):
        job_id = arg.get("job_id") if isinstance(arg, dict) else None
        with job_trace(job_id):
            return fn(arg, *a, **kw)

    return wrapper


def build_workpool_graph():
    from prometheus.nodes.assemble import assemble_node
    from prometheus.nodes.concierge import concierge_node
    from prometheus.nodes.critic import critic_node
    from prometheus.nodes.editor import editor_node
    from prometheus.nodes.repair import repair_node

    graph = StateGraph(OvaGenerationState)
    graph.add_node("concierge", _traced(concierge_node))
    graph.add_node("resource_worker", _traced(resource_worker))
    graph.add_node("collect", _traced(collect_node))
    graph.add_node("critic", _traced(critic_node))
    graph.add_node("repair", _traced(repair_node))
    graph.add_node("editor", _traced(editor_node))
    graph.add_node("assemble", _traced(assemble_node))

    graph.add_edge(START, "concierge")
    graph.add_conditional_edges("concierge", fan_out, ["resource_worker", "collect"])
    graph.add_edge("resource_worker", "collect")
    graph.add_edge("collect", "critic")
    graph.add_edge("critic", "repair")
    graph.add_edge("repair", "editor")
    graph.add_edge("editor", "assemble")
    graph.add_edge("assemble", END)
    return graph
