"""Call real LLM agents for OVA phase regeneration.

Translates an OvaPhase (phase_type + resource_type_id) back to the correct
ENGAGE or EXPLORE generation pipeline so regen produces fresh AI content
instead of static placeholder text.
"""

import logging

from agents.engage_prompts import RECURSOS_META as ENGAGE_META
from agents.explore_prompts import CODE_ONLY as EXPLORE_CODE_ONLY
from agents.explore_prompts import RECURSOS_META as EXPLORE_META

logger = logging.getLogger(__name__)

# Map resource_type name → numeric id for fallback title parsing.
_ENGAGE_NAME_TO_ID = {v["tipo"]: k for k, v in ENGAGE_META.items()}
_EXPLORE_NAME_TO_ID = {v["tipo"]: k for k, v in EXPLORE_META.items()}


def resolve_resource_type(phase: object) -> int | None:
    """Determine the numeric resource_type (1-10) from an OvaPhase row.

    Priority: explicit resource_type_id column > parse from title.
    Returns None if the resource type cannot be determined.
    """
    if phase.resource_type_id:
        return phase.resource_type_id

    # Fallback: parse from title like "ENGAGE · Cómic Interactivo" or "Cómic Interactivo"
    title = (phase.title or "").strip()
    name = title.split(" · ", 1)[1].strip() if " · " in title else title
    lookup = _ENGAGE_NAME_TO_ID if phase.phase_type == "engage" else _EXPLORE_NAME_TO_ID
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
    from agents.engage_prompts import prompt_html, prompt_simulador, prompt_texto
    from agents.html_validator import validate_and_repair
    from agents.llm_router import generar_texto
    from agents.podcast import build_podcast_html, podcast_audio_b64
    from agents.utils import parse_json, strip_markdown

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
    from agents.explore_prompts import prompt_codigo, prompt_html, prompt_texto
    from agents.html_validator import validate_and_repair
    from agents.llm_router import generar_texto
    from agents.utils import parse_json, strip_markdown

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


def _safe_parse_json(raw: str, parser):
    """Parse JSON from LLM output with fallback to raw text dict."""
    try:
        return parser(raw)
    except Exception:
        logger.warning("JSON parse failed during regen, using raw text")
        return {"contenido": raw}
