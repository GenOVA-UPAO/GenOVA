"""EVALUATE agent node — generates ALL evaluate resources in parallel (Fase 2)."""

from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.evaluate_prompts import RECURSOS_META
from prometheus.runtime import run_phase
from prometheus.state import OvaGenerationState

EVALUATE_CODE_ONLY = {3, 5, 9}


def _dispatch(rt, concept, llm_config, enabled_models, theme, image_settings=None):
    gen = direct_code_gen if rt in EVALUATE_CODE_ONLY else two_step_gen
    return gen("evaluate", rt, concept, llm_config, enabled_models, theme)


def evaluate_node(state: OvaGenerationState) -> dict:
    return run_phase(state, "evaluate", _dispatch, RECURSOS_META)
