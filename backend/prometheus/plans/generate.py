"""Generación de un recurso 5E con el motor por plantillas (ova_engine) o podcast.

Todos los recursos se resuelven con plantillas deterministas (`ova_engine`), salvo
`engage:3` (micro-podcast). Se retiraron los planes legacy `two_step` y `direct_code`
(LLM → HTML).
"""

from __future__ import annotations

from typing import NamedTuple

import structlog

from prometheus.plans.plan_map import PODCAST, plan_for

logger = structlog.get_logger(__name__)


class ResourceResult(NamedTuple):
    html: str
    defects: list[str]  # defectos estructurales restantes
    raw_json: dict | list | None  # datos JSON del recurso (o {"monologue": ...} para podcast)


def _gen_podcast(
    phase: str,
    rt: int,
    concept: str,
    contexto: str,
    llm_config,
    enabled_models,
    deadline=None,
    *,
    fake: bool = False,
) -> ResourceResult:
    from llm.podcast.podcast import build_podcast_html, plain_monologue, podcast_audio
    from prometheus.prompts.engage_prompts import prompt_texto

    if fake:
        mono = f"Micro-podcast educativo sobre {concept}."
        audio = None
    else:
        from ova_engine.text import generate_plain

        mono = generate_plain(
            prompt_texto(rt, concept, contexto),
            llm_config=llm_config,
            enabled_models=enabled_models,
            deadline=deadline,
        )
        mono = plain_monologue(mono)
        audio = podcast_audio(mono)

    html = build_podcast_html(concept, mono, *(audio or (None,)))
    return ResourceResult(html, [], {"monologue": mono})


def _gen_template(
    spec,
    concept: str,
    contexto: str,
    theme: dict,
    image_settings: dict | None,
    resource_config: dict | None,
    llm_config,
    enabled_models,
    deadline: float | None,
    *,
    fake: bool,
) -> ResourceResult:
    from ova_engine.pipeline import generate_with_template
    from prometheus.engine.validate import resource_defects

    html, data = generate_with_template(
        spec,
        concept,
        contexto=contexto,
        theme=theme,
        image_settings=image_settings,
        resource_config=resource_config,
        llm_config=llm_config,
        enabled_models=enabled_models,
        deadline=deadline,
        fake=fake,
    )
    return ResourceResult(html, resource_defects(html, concept), data)


def generate_resource(
    phase: str,
    rt: int,
    concept: str,
    *,
    plan: str | None = None,
    llm_config=None,
    enabled_models=None,
    theme: dict | None = None,
    image_settings: dict | None = None,
    resource_config: dict | None = None,
    contexto: str = "",
    refine: bool = True,  # conservado por compatibilidad de firma
    deadline: float | None = None,
) -> ResourceResult:
    """Genera UN recurso 5E con el pipeline moderno de plantillas (o podcast)."""
    from core.config import settings
    from ova_engine.registry import get_spec

    n = int(rt)
    resolved_plan = plan or plan_for(phase, n)

    if resolved_plan == PODCAST or (phase == "engage" and n == 3):
        return _gen_podcast(
            phase,
            n,
            concept,
            contexto,
            llm_config,
            enabled_models,
            deadline,
            fake=settings.llm_fake,
        )

    spec = get_spec(phase, n)
    if spec is None:
        raise ValueError(f"No existe plantilla para el recurso {phase}:{n}")

    return _gen_template(
        spec,
        concept,
        contexto=contexto,
        theme=theme or {},
        image_settings=image_settings,
        resource_config=resource_config,
        llm_config=llm_config,
        enabled_models=enabled_models,
        deadline=deadline,
        fake=settings.llm_fake,
    )
