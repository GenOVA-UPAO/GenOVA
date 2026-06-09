"""Podcast generation plan — monologue → TTS → embeddable HTML player.

ENGAGE resource type 3 only. Phase-agnostic but currently only used for engage.
"""

from agents.llm_router import generar_texto
from agents.podcast import build_podcast_html, podcast_audio_b64


def podcast_gen(phase: str, rt: int, concept: str, llm_config=None, enabled_models=None) -> str:
    from agents.engage_prompts import prompt_texto as engage_prompt_texto

    mono = generar_texto(
        engage_prompt_texto(rt, concept, ""),
        "texto",
        700,
        llm_config,
        enabled_models,
    )
    audio_b64 = podcast_audio_b64(mono)
    return build_podcast_html(concept, mono, audio_b64)
