"""EXPLORE agent node — generates ALL explore resources in parallel (Fase 2)."""

from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.explore_prompts import RECURSOS_META
from prometheus.runtime import run_phase
from prometheus.state import OvaGenerationState

EXPLORE_CODE_ONLY = {1, 6, 10}


def _dispatch(rt, concept, llm_config, enabled_models, theme):
    gen = direct_code_gen if rt in EXPLORE_CODE_ONLY else two_step_gen
    return gen("explore", rt, concept, llm_config, enabled_models, theme)


def explore_node(state: OvaGenerationState) -> dict:
    return run_phase(state, "explore", _dispatch, RECURSOS_META)
