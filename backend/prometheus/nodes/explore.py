"""EXPLORE agent node — generates one EXPLORE-phase resource per invocation."""

import logging

from agents.explore_prompts import RECURSOS_META
from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)

EXPLORE_CODE_ONLY = {1, 6, 10}


def explore_node(state: OvaGenerationState) -> dict:
    phases = state.get("phases", {})
    resource_idx = state.get("current_resource_idx", 0)
    resources = phases.get("explore", [])

    if resource_idx >= len(resources):
        return {}

    goal = resources[resource_idx]
    rt = goal["resource_type"]
    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])
    meta = RECURSOS_META.get(rt, {"tipo": "Recurso", "emoji": ""})

    logger.info("EXPLORE agent: generating '%s' (type %d)", meta["tipo"], rt)

    try:
        if rt in EXPLORE_CODE_ONLY:
            html = direct_code_gen("explore", rt, concept, llm_config, enabled_models)
        else:
            html = two_step_gen("explore", rt, concept, llm_config, enabled_models)
    except Exception as exc:
        logger.exception("EXPLORE resource %d failed", rt)
        return {
            "errors": [{"phase": "explore", "resource_type": rt, "error": str(exc)}],
            "current_resource_idx": resource_idx + 1,
            "progress": state.get("progress", 0) + 1,
        }

    return {
        "results": [{"phase": "explore", "html": html, "resource_type": rt, "title": meta["tipo"]}],
        "current_resource_idx": resource_idx + 1,
        "progress": state.get("progress", 0) + 1,
    }
