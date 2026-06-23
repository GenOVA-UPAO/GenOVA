"""EVALUATE agent node — generates ALL evaluate resources in parallel (Fase 2)."""

from prometheus.engine.runtime import run_phase
from prometheus.engine.state import OvaGenerationState
from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.evaluate_prompts import RECURSOS_META

EVALUATE_CODE_ONLY = {3, 5, 9}


def _dispatch(rt, concept, llm_config, enabled_models, theme, image_settings=None, resource_config=None):
    gen = direct_code_gen if rt in EVALUATE_CODE_ONLY else two_step_gen
    return gen("evaluate", rt, concept, llm_config, enabled_models, theme, resource_config=resource_config)


def evaluate_node(state: OvaGenerationState) -> dict:
    return run_phase(state, "evaluate", _dispatch, RECURSOS_META)
