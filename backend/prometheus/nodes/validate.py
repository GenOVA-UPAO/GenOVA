"""Validate node — runs html_validator on current_result and returns verdict.

Conditional edges in the graph use the result to route to next_phase or retry.
"""

import logging

from llm.html_validator import validate_and_repair
from prometheus.state import OvaGenerationState

logger = logging.getLogger(__name__)


def validate_node(state: OvaGenerationState) -> dict:
    results = state.get("results", [])
    if not results:
        return {"valid": True}

    last = results[-1]
    html = last.get("html", "")
    phase = last.get("phase", "engage")
    rt = last.get("resource_type", 1)

    valid, errors = validate_and_repair(html, phase, rt)
    if not valid:
        logger.warning("Validation failed for %s/%d: %s", phase, rt, errors)
        return {"valid": False, "errors": state.get("errors", [])}

    return {"valid": True}
