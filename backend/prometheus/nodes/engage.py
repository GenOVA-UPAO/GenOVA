"""ENGAGE agent node — generates ALL engage resources for the job in parallel.

Fase 2: the phase's resources run concurrently (bounded pool) and persist as
they finish; see prometheus.runtime.run_phase. Dispatch picks the plan per type:
podcast (3), direct simulator (10), else two-step (text→HTML).
"""

from prometheus.engine.runtime import run_phase
from prometheus.engine.state import OvaGenerationState
from prometheus.plans.direct_code import direct_code_gen
from prometheus.plans.podcast import podcast_gen
from prometheus.plans.two_step import two_step_gen
from prometheus.prompts.engage_prompts import RECURSOS_META


def _dispatch(rt, concept, llm_config, enabled_models, theme, image_settings=None, resource_config=None):
    if rt == 3:
        return podcast_gen("engage", rt, concept, llm_config, enabled_models, theme)
    if rt == 10:
        return direct_code_gen("engage", rt, concept, llm_config, enabled_models, theme, resource_config)
    return two_step_gen("engage", rt, concept, llm_config, enabled_models, theme, image_settings, resource_config)


def engage_node(state: OvaGenerationState) -> dict:
    return run_phase(state, "engage", _dispatch, RECURSOS_META)
