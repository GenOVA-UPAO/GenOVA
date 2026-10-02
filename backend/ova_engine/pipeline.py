"""Pipeline del motor por plantillas para UN recurso.

    decide(params) → texto JSON (LLM, validado) → imágenes → render → runtime UPAO

Sin paso HTML del LLM ni refinado: el HTML sale de la plantilla, así que no hay
JS roto, truncado ni diseño inconsistente que reparar. El texto es lo único
variable y está validado contra el schema.
"""

from __future__ import annotations

import time

import structlog

from ova_engine.contract import RenderContext, TemplateSpec
from ova_engine.decision import decide
from ova_engine.html import document
from ova_engine.text import generate_json

logger = structlog.get_logger(__name__)


def render_resource(spec: TemplateSpec, data: dict, concept: str, params: dict, theme: dict | None = None) -> str:
    from llm.utils.ova_runtime import inject_runtime

    theme = theme or {}
    ctx = RenderContext(concept=concept, phase=spec.phase, rt=spec.rt, title=spec.title, params=params)
    html = document(f"{spec.title}: {concept}", spec.render(data, ctx))
    return inject_runtime(
        html,
        css=theme.get("color", "upao") != "free",
        # Las plantillas SIEMPRE usan los componentes UPAO.
        components=True,
        palette=theme.get("palette") if theme.get("color") == "custom" else None,
    )


def generate_with_template(
    spec: TemplateSpec,
    concept: str,
    *,
    contexto: str = "",
    theme: dict | None = None,
    image_settings: dict | None = None,
    resource_config: dict | None = None,
    llm_config=None,
    enabled_models=None,
    deadline: float | None = None,
    fake: bool = False,
):
    """Devuelve (html, data). `fake` = datos de `spec.sample` (sin LLM)."""
    from llm.images.image_placeholder import resolve_image_placeholders

    t0 = time.monotonic()
    params = decide(spec, concept, contexto, override=resource_config)
    if fake:
        data = spec.sample(concept, params)
    else:
        data = generate_json(
            spec.prompt(concept, contexto, params),
            spec.schema(params),
            llm_config=llm_config,
            enabled_models=enabled_models,
            deadline=deadline,
        )
    t_text = time.monotonic()
    # Recursos de video (engage 2, explore 4, explain 1): el video se encarga con el
    # guion (`prompt_video` del JSON) y se genera en paralelo al render.
    pending_video = None
    if not fake:
        from prometheus.plans.video_step import start_video

        pending_video = start_video(spec.phase, spec.rt, concept, data, llm_config)
    replacements: dict[str, str] = {}
    if spec.uses_images and image_settings and image_settings.get("enabled", True):
        from llm.images.image_enrich import enrich_with_images

        try:
            replacements = enrich_with_images(data, image_settings)
        except Exception as exc:  # la imagen nunca tumba el recurso
            logger.warning("ova engine images failed", key=spec.key, error=str(exc)[:200])
    html = resolve_image_placeholders(render_resource(spec, data, concept, params, theme), replacements)
    if pending_video is not None:
        from prometheus.plans.video_step import attach_video

        html = attach_video(html, pending_video)
    logger.info(
        "ova engine resource",
        key=spec.key,
        params=params,
        text_s=round(t_text - t0, 2),
        total_s=round(time.monotonic() - t0, 2),
        images=len(replacements),
    )
    return html, data
