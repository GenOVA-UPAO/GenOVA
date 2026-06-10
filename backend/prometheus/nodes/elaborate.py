"""ELABORATE agent node — generates one ELABORATE-phase resource per invocation."""

import logging

from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)

ELABORATE_CODE_ONLY = {4, 5, 7, 9}


def elaborate_node(state: OvaGenerationState) -> dict:
    phases = state.get("phases", {})
    resource_idx = state.get("current_resource_idx", 0)
    resources = phases.get("elaborate", [])

    if resource_idx >= len(resources):
        return {}

    goal = resources[resource_idx]
    rt = goal["resource_type"]
    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])

    logger.info("ELABORATE agent: generating resource type %d", rt)

    try:
        if rt in ELABORATE_CODE_ONLY:
            html = direct_code_gen("elaborate", rt, concept, llm_config, enabled_models)
        else:
            html = two_step_gen("elaborate", rt, concept, llm_config, enabled_models)
    except Exception as exc:
        logger.exception("ELABORATE resource %d failed", rt)
        return {
            "errors": [{"phase": "elaborate", "resource_type": rt, "error": str(exc)}],
            "current_resource_idx": resource_idx + 1,
            "progress": state.get("progress", 0) + 1,
        }

    return {
        "results": [{"phase": "elaborate", "html": html, "resource_type": rt}],
        "current_resource_idx": resource_idx + 1,
        "progress": state.get("progress", 0) + 1,
    }
