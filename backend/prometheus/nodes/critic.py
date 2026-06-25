"""Critic node — pedagogical quality evaluator and refiner (EN-015).

LangGraph node that runs after every phase. When enabled (ova_critic=1 via
admin panel), evaluates each resource with an LLM critic and optionally
re-generates it using structured feedback. When disabled, passes results
through unchanged (zero LLM calls). Always commits current_phase_results
to the main ``results`` list and performs BDI belief revision.

Flow: engage → critic → explore → critic → … → editor
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from core.config import settings

logger = logging.getLogger(__name__)


def critic_node(state: dict) -> dict:
    phase_results = state.get("current_phase_results", [])
    last_phase = state.get("last_phase", "")

    if not phase_results:
        return {"beliefs": _revise(state, last_phase, [], [])}

    from prometheus.config.nodes_config import get_nodes_config

    nc = get_nodes_config()
    enabled = str(nc.get("ova_critic", settings.ova_critic)).strip().lower() not in (
        "0",
        "false",
        "no",
    )

    if not enabled:
        return {
            "results": phase_results,
            "beliefs": _revise(state, last_phase, phase_results, state.get("current_phase_errors", [])),
        }

    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])
    theme = state.get("theme", {})
    max_rounds = max(0, nc.get("ova_reflection_rounds", settings.ova_reflection_rounds))

    refined = []
    workers = min(4, len(phase_results))

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(_evaluate, r, concept, llm_config, enabled_models, theme, max_rounds)
            for r in phase_results
        ]
        for fut in as_completed(futures):
            refined.append(fut.result())

    logger.info("Critic: %d/%d resources refined for phase %s", len(refined), len(phase_results), last_phase)
    return {
        "results": refined,
        "beliefs": _revise(state, last_phase, refined, state.get("current_phase_errors", [])),
    }


def _evaluate(result: dict, concept: str, llm_config, enabled_models, theme, max_rounds: int) -> dict:
    from prometheus.critic.critic import critique_resource
    from prometheus.engine.refine import apply_feedback

    html = result["html"]
    rt = result["resource_type"]
    phase = result["phase"]
    best_html, best_score = html, 0
    issues: list = []

    for ronda in range(max_rounds + 1):
        try:
            r = critique_resource(html, phase, rt, concept, llm_config, enabled_models, theme)
        except Exception:  # noqa: BLE001
            logger.exception("critic failed for %s/%s round %d", phase, rt, ronda)
            break

        score = r.get("puntaje", 0)
        issues = r.get("problemas", [])
        veredicto = r.get("veredicto", "aceptar")

        if score > best_score:
            best_html, best_score = html, score

        if veredicto != "revisar" or ronda >= max_rounds:
            break

        try:
            html = apply_feedback(html, concept, issues, phase, rt, llm_config, enabled_models, theme)
        except Exception:  # noqa: BLE001
            logger.exception("apply_feedback failed for %s/%s", phase, rt)
            break

    return {**result, "html": best_html, "score": best_score, "critic_issues": issues}


def _revise(state: dict, phase: str, results: list, errors: list) -> dict:
    from prometheus.engine.bdi import revise_beliefs

    return revise_beliefs(state.get("beliefs", {}), phase, results, errors)
