"""Single-resource LLM generation for Labs (the heavy per-slot work).

Kept apart from generation.py (job store + worker orchestration) so each file
holds one concern.
"""

import json
import logging

from labs.prompt_utils import CONCEPT_PH, ENGAGE_CODE, ENGAGE_PODCAST, EXPLORE_CODE
from llm.podcast.podcast import build_podcast_html, podcast_audio_b64
from llm.router import generar_texto, generar_texto_with_model
from llm.utils.utils import parse_json, strip_markdown

logger = logging.getLogger(__name__)


def _safe_error(exc: BaseException) -> str:
    """Generic, leak-safe error label for the client. Full detail goes to logs."""
    name = type(exc).__name__
    if "RateLimit" in name or "429" in name:
        return "rate_limited"
    if "Timeout" in name:
        return "timeout"
    if "Auth" in name or "401" in name or "403" in name:
        return "auth_error"
    return "generation_failed"


def _generate_one(
    phase: str,
    resource_type: int,
    concept: str,
    prompt_text: str,
    model_id: str,
    provider: str,
) -> tuple[str | None, dict | None, str | None]:
    """Run one resource generation. Returns (html, raw_json, error)."""
    effective = prompt_text.replace(CONCEPT_PH, concept)
    try:
        if phase == "engage":
            if resource_type in ENGAGE_CODE:
                return (
                    strip_markdown(
                        generar_texto_with_model(effective, model_id, provider, max_tokens=4000)
                    ),
                    None,
                    None,
                )
            if resource_type in ENGAGE_PODCAST:
                mono = generar_texto_with_model(effective, model_id, provider, max_tokens=700)
                return (
                    build_podcast_html(concept, mono, podcast_audio_b64(mono)),
                    {"monologue": mono},
                    None,
                )
            # 2-step
            raw = generar_texto_with_model(effective, model_id, provider, max_tokens=2000)
            try:
                json_data = parse_json(raw)
            except Exception:
                json_data = {"contenido": raw}
            from prometheus.prompts.engage_prompts import prompt_html as engage_html

            html = strip_markdown(
                generar_texto(
                    engage_html(
                        resource_type, concept, json.dumps(json_data, ensure_ascii=False, indent=2)
                    ),
                    "codigo",
                    max_tokens=4000,
                )
            )
            return html, json_data, None
        # explore
        if resource_type in EXPLORE_CODE:
            return (
                strip_markdown(
                    generar_texto_with_model(effective, model_id, provider, max_tokens=4000)
                ),
                None,
                None,
            )
        raw = generar_texto_with_model(effective, model_id, provider, max_tokens=2000)
        try:
            json_data = parse_json(raw)
        except Exception:
            json_data = {"contenido": raw}
        from prometheus.prompts.explore_prompts import prompt_html as explore_html

        html = strip_markdown(
            generar_texto(
                explore_html(
                    resource_type, concept, json.dumps(json_data, ensure_ascii=False, indent=2)
                ),
                "codigo",
                max_tokens=4000,
            )
        )
        return html, json_data, None
    except Exception as exc:
        logger.exception("Lab generation failed (phase=%s type=%s)", phase, resource_type)
        return None, None, _safe_error(exc)
