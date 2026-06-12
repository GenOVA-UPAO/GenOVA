"""EXPLAIN agent node — generates ALL explain resources in parallel (Fase 2)."""

from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.explain_prompts import RECURSOS_META
from prometheus.runtime import run_phase
from prometheus.state import OvaGenerationState

EXPLAIN_CODE_ONLY = {3, 5, 8, 10}


def _dispatch(rt, concept, llm_config, enabled_models, theme, image_settings=None):
    gen = direct_code_gen if rt in EXPLAIN_CODE_ONLY else two_step_gen
    return gen("explain", rt, concept, llm_config, enabled_models, theme)


def explain_node(state: OvaGenerationState) -> dict:
    return run_phase(state, "explain", _dispatch, RECURSOS_META)
