"""Generador-Crítico bounded loop (EN-015).

Extracted from runtime.py to respect the 200-line file limit.  Called by
`run_phase._work` when `OVA_CRITIC` is enabled.
"""

import logging

from core.config import settings

logger = logging.getLogger(__name__)


def _critic_enabled() -> bool:
    from prometheus.nodes_config import get_nodes_config

    nc = get_nodes_config()
    return str(nc.get("ova_critic", settings.ova_critic)).strip().lower() not in (
        "0",
        "false",
        "no",
    )


def critic_loop(
    html: str,
    phase: str,
    rt: int,
    concept: str,
    llm_config,
    enabled_models,
    theme,
) -> tuple:
    """Run bounded evaluate→(optionally re-generate) loop.

    Returns (best_html, best_score, issues).  Never raises: on any failure the
    original html is returned with score=0 and issues=[] (R4).
    """
    from prometheus.critic import critique_resource
    from prometheus.nodes_config import get_nodes_config
    from prometheus.refine import apply_feedback

    nc = get_nodes_config()
    max_rounds = max(0, nc.get("ova_reflection_rounds", settings.ova_reflection_rounds))
    best_html, best_score = html, 0
    issues: list = []

    for ronda in range(max_rounds + 1):  # ronda 0 = evaluate initial; 1..max = re-generate
        try:
            result = critique_resource(html, phase, rt, concept, llm_config, enabled_models, theme)
        except Exception:  # noqa: BLE001
            logger.exception("critic failed for %s/%s round %d", phase, rt, ronda)
            break

        score = result.get("puntaje", 0)
        issues = result.get("problemas", [])
        veredicto = result.get("veredicto", "aceptar")

        if score > best_score:
            best_html, best_score = html, score

        if veredicto != "revisar" or ronda >= max_rounds:
            break

        # Re-generate with feedback
        try:
            html = apply_feedback(
                html, concept, issues, phase, rt, llm_config, enabled_models, theme
            )
        except Exception:  # noqa: BLE001
            logger.exception("apply_feedback failed for %s/%s", phase, rt)
            break

    return best_html, best_score, issues
