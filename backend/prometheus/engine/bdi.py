"""BDI deliberation cycle for the Prometheus multi-agent system.

Implements the Rao & Georgeff / Padgham & Winikoff BDI interpreter loop:
  Beliefs  ← form_beliefs(state perception)
  Desires  ← generate_desires(candidate plan)
  Intentions ← deliberar(desires, beliefs)   ← liberador BDI
  [after each phase] Beliefs ← revise_beliefs(beliefs, phase_outcome)

The deliberation function (``deliberar``) is the "liberador BDI": it evaluates
each desire against the agent's current beliefs and commits only viable ones
as active intentions, assigning an execution plan type to each.
"""

import logging
import math

logger = logging.getLogger(__name__)

# Resource types requiring high model capability (complex interactives)
_COMPLEX_TYPES = frozenset({4, 7, 9, 10})

# Resource types that benefit greatly from uploaded RAG context
_CONTEXT_HEAVY = frozenset({2, 3, 5, 6, 8})

# Resource types with a specific plan (not the default two-step)
_PLAN_TYPE_MAP = {3: "podcast"}


def form_beliefs(
    prompt: str,
    rag_context: str,
    enabled_models: list,
    upload_ids: list,
) -> dict:
    """Form initial beliefs from the agent's perception of the generation context.

    Beliefs represent what the agent knows about the problem before planning:
    quality of available knowledge (RAG), topic complexity, and model capability.
    """
    rag_quality = _score_rag(rag_context, upload_ids)
    return {
        "rag_quality": rag_quality,
        "topic_complexity": _score_complexity(prompt),
        "model_capability": _score_models(enabled_models),
        "has_uploads": bool(upload_ids),
        "completed_phases": [],
        "accumulated_errors": 0,
        "last_phase_quality": None,
    }


def generate_desires(phases_input: dict) -> list[dict]:
    """Generate desires from the candidate plan — all resources the agent wants to produce."""
    desires = []
    for phase, items in phases_input.items():
        for item in items:
            desires.append(
                {
                    "phase": phase,
                    "resource_type": item["resource_type"],
                    "resource_order": item["resource_order"],
                    "priority": 1.0,
                }
            )
    return desires


def deliberar(desires: list[dict], beliefs: dict) -> list[dict]:
    """Liberador BDI — filtro deliberativo que convierte deseos en intenciones.

    Evalúa cada deseo contra las creencias actuales del agente y decide
    comprometerse con él como intención activa. Asigna un tipo de plan y
    calcula una viabilidad 0–1. Es el núcleo del ciclo BDI Prometheus:
    los deseos quedan "liberados" como intenciones cuando pasan el filtro.
    """
    intentions = []
    for desire in desires:
        viability = _score_viability(desire, beliefs)
        if viability > 0:
            intentions.append(
                {
                    **desire,
                    "plan_type": _select_plan_type(desire),
                    "viability": round(viability, 3),
                    "committed": True,
                }
            )

    intentions.sort(key=lambda i: i["priority"] * i["viability"], reverse=True)
    logger.info(
        "BDI deliberation: %d desires → %d intentions (beliefs: rag=%.2f, complexity=%.2f, models=%.2f)",
        len(desires),
        len(intentions),
        beliefs.get("rag_quality", 0),
        beliefs.get("topic_complexity", 0),
        beliefs.get("model_capability", 0),
    )
    return intentions


def revise_beliefs(beliefs: dict, phase: str, results: list, errors: list) -> dict:
    """Belief revision after a phase completes.

    Updates the agent's beliefs with evidence from the just-completed phase,
    allowing later deliberation cycles (in multi-agent chaining) to adapt.
    """
    total = max(1, len(results) + len(errors))
    quality = round(len(results) / total, 3)
    return {
        **beliefs,
        "last_phase_quality": quality,
        "completed_phases": beliefs.get("completed_phases", []) + [phase],
        "accumulated_errors": beliefs.get("accumulated_errors", 0) + len(errors),
    }


# ── private helpers ────────────────────────────────────────────────────────────


def _score_rag(rag_context: str, upload_ids: list) -> float:
    """Score RAG context quality (0–1).

    Uses character length as a heuristic when context text is available;
    falls back to upload presence as a proxy when context hasn't been
    retrieved yet (concierge runs before RAG retrieval).
    """
    if rag_context:
        return round(min(1.0, math.log1p(len(rag_context)) / math.log1p(5000)), 3)
    return 0.7 if upload_ids else 0.0


def _score_complexity(prompt: str) -> float:
    """Estimate topic complexity from prompt length (0–1, saturates at 80 words)."""
    if not prompt:
        return 0.5
    return round(min(1.0, len(prompt.split()) / 80), 3)


def _score_models(enabled_models: list) -> float:
    """Score model capability tier from enabled model list (0–1)."""
    if not enabled_models:
        return 0.5
    premium_keywords = {"70b", "large", "deepseek", "gemini", "claude", "gpt-4", "mixtral-8x22"}
    ids = {str(m.get("id", "") or m.get("model", "")).lower() for m in enabled_models}
    has_premium = any(kw in mid for mid in ids for kw in premium_keywords)
    return 1.0 if has_premium else 0.6


def _score_viability(desire: dict, beliefs: dict) -> float:
    """Compute viability of committing to a desire given current beliefs (0–1).

    Applies small discounts for complex resources against weak models or poor context.
    Minimum is 0.5 — client-selected resources are always committed.
    """
    rt = desire.get("resource_type", 0)
    rag = beliefs.get("rag_quality", 0.5)
    cap = beliefs.get("model_capability", 0.5)

    viability = 1.0
    if rt in _COMPLEX_TYPES and cap < 0.6:
        viability *= 0.8
    if rt in _CONTEXT_HEAVY and rag < 0.2:
        viability *= 0.85
    return max(0.5, round(viability, 3))


def _select_plan_type(desire: dict) -> str:
    """Assign an execution plan type to a desire for intention traceability."""
    rt = desire.get("resource_type", 0)
    if rt in _PLAN_TYPE_MAP:
        return _PLAN_TYPE_MAP[rt]
    if desire.get("phase") == "elaborate" and rt == 7:
        return "lab_codigo"
    return "two_step"
