"""Call real LLM agents for OVA phase regeneration.

Translates an OvaPhase (phase_type + resource_type_id) back to the correct
5E generation pipeline so regen produces fresh AI content.
"""

import logging

from prometheus.prompts.elaborate_prompts import RECURSOS_META as ELABORATE_META
from prometheus.prompts.engage_prompts import RECURSOS_META as ENGAGE_META
from prometheus.prompts.evaluate_prompts import RECURSOS_META as EVALUATE_META
from prometheus.prompts.explain_prompts import RECURSOS_META as EXPLAIN_META
from prometheus.prompts.explore_prompts import RECURSOS_META as EXPLORE_META

logger = logging.getLogger(__name__)

# Map resource_type name → numeric id for fallback title parsing.
_ENGAGE_NAME_TO_ID = {v["tipo"]: k for k, v in ENGAGE_META.items()}
_EXPLORE_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLORE_META.items()}
_EXPLAIN_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLAIN_META.items()}
_ELABORATE_NAME_TO_ID = {v["tipo"]: k for k, v in ELABORATE_META.items()}
_EVALUATE_NAME_TO_ID = {v["tipo"]: k for k, v in EVALUATE_META.items()}
# Default resource_type id per phase — mirrors jobs_helpers._DEFAULT_PLAN.
_PHASE_DEFAULT_ID = {
    "engage": 1,
    "explore": 2,
    "explain": 3,
    "elaborate": 4,
    "evaluate": 5,
}

_PHASE_LOOKUP = {
    "engage": _ENGAGE_NAME_TO_ID,
    "explore": _EXPLORE_NAME_TO_ID,
    "explain": _EXPLAIN_NAME_TO_ID,
    "elaborate": _ELABORATE_NAME_TO_ID,
    "evaluate": _EVALUATE_NAME_TO_ID,
}


def resolve_resource_type(phase: object) -> int | None:
    """Determine the numeric resource_type (1-10) from an OvaPhase row.

    Priority: explicit resource_type_id column > parse from title.
    Returns None if the resource type cannot be determined.
    """
    if phase.resource_type_id:
        return phase.resource_type_id

    title = (phase.title or "").strip()
    name = title.split(" · ", 1)[1].strip() if " · " in title else title
    lookup = _PHASE_LOOKUP.get(phase.phase_type, _ENGAGE_NAME_TO_ID)
    rid = lookup.get(name)
    if rid:
        return rid

    # Legacy recovery: use phase default when resource_type_id is missing.
    fallback = _PHASE_DEFAULT_ID.get(phase.phase_type)
    if fallback is not None:
        logger.warning(
            "Unresolved resource_type for phase %s (type=%s, title=%r) — using default id %d",
            phase.id,
            phase.phase_type,
            phase.title,
            fallback,
        )
        return fallback

    logger.warning(
        "Cannot resolve resource_type for phase %s (type=%s, title=%r)",
        phase.id,
        phase.phase_type,
        phase.title,
    )
    return None
