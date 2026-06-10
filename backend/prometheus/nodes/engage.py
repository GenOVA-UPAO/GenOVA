"""ENGAGE agent node — generates one ENGAGE-phase resource per invocation.

PEVR loop: Perceive (RAG context) → Evaluate (select plan) → Respond (LLM call).
Verify happens in the separate validate node (conditional edge in graph).
"""

import logging

from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.podcast import podcast_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.engage_prompts import RECURSOS_META
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)


def engage_node(state: OvaGenerationState) -> dict:
    phases = state.get("phases", {})
    resource_idx = state.get("current_resource_idx", 0)
    resources = phases.get("engage", [])

    if resource_idx >= len(resources):
        return {}

    goal = resources[resource_idx]
    rt = goal["resource_type"]
    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])
    meta = RECURSOS_META.get(rt, {"tipo": "Recurso", "emoji": ""})

    logger.info("ENGAGE agent: generating '%s' (type %d)", meta["tipo"], rt)

    try:
        if rt == 3:
            html = podcast_gen("engage", rt, concept, llm_config, enabled_models)
        elif rt == 10:
            html = direct_code_gen("engage", rt, concept, llm_config, enabled_models)
        else:
            html = two_step_gen("engage", rt, concept, llm_config, enabled_models)
    except Exception as exc:
        logger.exception("ENGAGE resource %d failed", rt)
        return {
            "errors": [{"phase": "engage", "resource_type": rt, "error": str(exc)}],
            "current_resource_idx": resource_idx + 1,
            "progress": state.get("progress", 0) + 1,
        }

    return {
        "results": [{"phase": "engage", "html": html, "resource_type": rt, "title": meta["tipo"]}],
        "current_resource_idx": resource_idx + 1,
        "progress": state.get("progress", 0) + 1,
    }
