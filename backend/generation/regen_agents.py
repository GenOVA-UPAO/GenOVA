"""Call real LLM agents for OVA phase regeneration.

Translates an OvaPhase (phase_type + resource_type_id) back to the correct
5E generation pipeline so regen produces fresh AI content.
"""

import logging

from prometheus.prompts.elaborate_prompts import CODE_ONLY as ELABORATE_CODE_ONLY
from prometheus.prompts.elaborate_prompts import RECURSOS_META as ELABORATE_META
from prometheus.prompts.engage_prompts import RECURSOS_META as ENGAGE_META
from prometheus.prompts.evaluate_prompts import CODE_ONLY as EVALUATE_CODE_ONLY
from prometheus.prompts.evaluate_prompts import RECURSOS_META as EVALUATE_META
from prometheus.prompts.explain_prompts import CODE_ONLY as EXPLAIN_CODE_ONLY
from prometheus.prompts.explain_prompts import RECURSOS_META as EXPLAIN_META
from prometheus.prompts.explore_prompts import CODE_ONLY as EXPLORE_CODE_ONLY
from prometheus.prompts.explore_prompts import RECURSOS_META as EXPLORE_META

logger = logging.getLogger(__name__)

# Map resource_type name → numeric id for fallback title parsing.
_ENGAGE_NAME_TO_ID = {v["tipo"]: k for k, v in ENGAGE_META.items()}
_EXPLORE_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLORE_META.items()}
_EXPLAIN_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLAIN_META.items()}
_ELABORATE_NAME_TO_ID = {v["tipo"]: k for k, v in ELABORATE_META.items()}
_EVALUATE_NAME_TO_ID = {v["tipo"]: k for k, v in EVALUATE_META.items()}


def _phase_meta(phase_type: str):
    mapping = {
        "engage": ENGAGE_META,
        "explore": EXPLORE_META,
        "explain": EXPLAIN_META,
        "elaborate": ELABORATE_META,
        "evaluate": EVALUATE_META,
    }
    return mapping.get(phase_type, ENGAGE_META)


def resolve_resource_type(phase: object) -> int | None:
    """Determine the numeric resource_type (1-10) from an OvaPhase row.

    Priority: explicit resource_type_id column > parse from title.
    Returns None if the resource type cannot be determined.
    """
    if phase.resource_type_id:
        return phase.resource_type_id

    title = (phase.title or "").strip()
    name = title.split(" · ", 1)[1].strip() if " · " in title else title
    if phase.phase_type == "engage":
        lookup = _ENGAGE_NAME_TO_ID
    elif phase.phase_type == "explore":
        lookup = _EXPLORE_NAME_TO_ID
    elif phase.phase_type == "explain":
        lookup = _EXPLAIN_NAME_TO_ID
    elif phase.phase_type == "elaborate":
        lookup = _ELABORATE_NAME_TO_ID
    elif phase.phase_type == "evaluate":
        lookup = _EVALUATE_NAME_TO_ID
    else:
        lookup = _ENGAGE_NAME_TO_ID

    rid = lookup.get(name)
    if rid:
        return rid

    logger.warning(
        "Cannot resolve resource_type for phase %s (type=%s, title=%r)",
        phase.id,
        phase.phase_type,
        phase.title,
    )
    return None


def regenerate_phase_content(
    phase_type: str,
    resource_type: int,
    concept: str,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str | None:
    """Generate fresh HTML for a single phase using the real LLM agents.

    `llm_config` is the OVA owner's per-type model/timeout overrides (or None for
    system defaults). `enabled_models` restricts overrides to models the user has
    explicitly enabled. Returns the HTML string on success, None on failure.
    """
    try:
        if phase_type == "engage":
            return _generate_engage(resource_type, concept, llm_config, enabled_models)
        elif phase_type == "explore":
            return _generate_explore(resource_type, concept, llm_config, enabled_models)
        elif phase_type == "explain":
            return _generate_explain(resource_type, concept, llm_config, enabled_models)
        elif phase_type == "elaborate":
            return _generate_elaborate(resource_type, concept, llm_config, enabled_models)
        elif phase_type == "evaluate":
            return _generate_evaluate(resource_type, concept, llm_config, enabled_models)
        else:
            logger.warning("Unknown phase_type '%s' for regen", phase_type)
            return None
    except Exception:
        logger.exception(
            "Regen failed for %s/%d concept=%r",
            phase_type,
            resource_type,
            concept[:60],
        )
        return None


def _generate_engage(
    n: int, concept: str, llm_config: dict | None = None, enabled_models: list | None = None
) -> str:
    """Run the ENGAGE generation pipeline for resource type n."""
    from llm.html_validator import validate_and_repair
    from llm.podcast import build_podcast_html, podcast_audio_b64
    from llm.router import generar_texto
    from llm.utils import parse_json, strip_markdown
    from prometheus.prompts.engage_prompts import prompt_html, prompt_simulador, prompt_texto

    if n == 10:
        html = strip_markdown(
            generar_texto(
                prompt_simulador(concept, ""), "codigo", 12000, llm_config, enabled_models
            )
        )
        html, _ = validate_and_repair(html, "engage", n)
        return html

    if n == 3:
        mono = generar_texto(prompt_texto(n, concept, ""), "texto", 700, llm_config, enabled_models)
        audio_b64 = podcast_audio_b64(mono)
        return build_podcast_html(concept, mono, audio_b64)

    raw = generar_texto(prompt_texto(n, concept, ""), "texto", 3000, llm_config, enabled_models)
    json_data = _safe_parse_json(raw, parse_json)
    json_str = __import__("json").dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(
        generar_texto(
            prompt_html(n, concept, json_str, ""), "codigo", 12000, llm_config, enabled_models
        )
    )
    html, _ = validate_and_repair(html, "engage", n)
    return html


def _generate_explore(
    n: int, concept: str, llm_config: dict | None = None, enabled_models: list | None = None
) -> str:
    """Run the EXPLORE generation pipeline for resource type n."""
    from llm.html_validator import validate_and_repair
    from llm.router import generar_texto
    from llm.utils import parse_json, strip_markdown
    from prometheus.prompts.explore_prompts import prompt_codigo, prompt_html, prompt_texto

    if n in EXPLORE_CODE_ONLY:
        html = strip_markdown(
            generar_texto(
                prompt_codigo(n, concept, ""), "codigo", 12000, llm_config, enabled_models
            )
        )
        html, _ = validate_and_repair(html, "explore", n)
        return html

    raw = generar_texto(prompt_texto(n, concept, ""), "texto", 3000, llm_config, enabled_models)
    json_data = _safe_parse_json(raw, parse_json)
    json_str = __import__("json").dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(
        generar_texto(
            prompt_html(n, concept, json_str, ""), "codigo", 12000, llm_config, enabled_models
        )
    )
    html, _ = validate_and_repair(html, "explore", n)
    return html


def _generate_explain(
    n: int, concept: str, llm_config: dict | None = None, enabled_models: list | None = None
) -> str:
    """Run the EXPLAIN generation pipeline for resource type n."""
    from prometheus.plans.direct_code import direct_code_gen
    from prometheus.plans.two_step import two_step_gen

    if n in EXPLAIN_CODE_ONLY:
        return direct_code_gen("explain", n, concept, llm_config, enabled_models)
    return two_step_gen("explain", n, concept, llm_config, enabled_models)


def _generate_elaborate(
    n: int, concept: str, llm_config: dict | None = None, enabled_models: list | None = None
) -> str:
    """Run the ELABORATE generation pipeline for resource type n."""
    from prometheus.plans.direct_code import direct_code_gen
    from prometheus.plans.two_step import two_step_gen

    if n in ELABORATE_CODE_ONLY:
        return direct_code_gen("elaborate", n, concept, llm_config, enabled_models)
    return two_step_gen("elaborate", n, concept, llm_config, enabled_models)


def _generate_evaluate(
    n: int, concept: str, llm_config: dict | None = None, enabled_models: list | None = None
) -> str:
    """Run the EVALUATE generation pipeline for resource type n."""
    from prometheus.plans.direct_code import direct_code_gen
    from prometheus.plans.two_step import two_step_gen

    if n in EVALUATE_CODE_ONLY:
        return direct_code_gen("evaluate", n, concept, llm_config, enabled_models)
    return two_step_gen("evaluate", n, concept, llm_config, enabled_models)


def _safe_parse_json(raw: str, parser):
    """Parse JSON from LLM output with fallback to raw text dict."""
    try:
        return parser(raw)
    except Exception:
        logger.warning("JSON parse failed during regen, using raw text")
        return {"contenido": raw}
