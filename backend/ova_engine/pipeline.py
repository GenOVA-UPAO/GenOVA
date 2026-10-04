"""Pipeline del motor por plantillas para UN recurso.

    decide(params) → texto JSON (LLM, validado) → imágenes → render → runtime UPAO

Sin paso HTML del LLM ni refinado: el HTML sale de la plantilla, así que no hay
JS roto, truncado ni diseño inconsistente que reparar. El texto es lo único
variable y está validado contra el schema.
"""

from __future__ import annotations

import os
import time

import structlog

from ova_engine.contract import RenderContext, TemplateSpec
from ova_engine.decision import decide
from ova_engine.html import document
from ova_engine.review import review_and_fix
from ova_engine.text import generate_json

logger = structlog.get_logger(__name__)


def render_resource(
    spec: TemplateSpec, data: dict, concept: str, params: dict, theme: dict | None = None, review: dict | None = None
) -> str:
    from llm.utils.ova_runtime import inject_runtime

    theme = theme or {}
    ctx = RenderContext(concept=concept, phase=spec.phase, rt=spec.rt, title=spec.title, params=params)
    info = {"params": params, **({"review": review} if review else {})}
    html = document(f"{spec.title}: {concept}", spec.render(data, ctx), key=spec.key, info=info)
    return inject_runtime(
        html,
        css=theme.get("color", "upao") != "free",
        # Las plantillas SIEMPRE usan los componentes UPAO.
        components=True,
        palette=theme.get("palette") if theme.get("color") == "custom" else None,
    )


def _review_step(spec, concept, params, data, fake, llm_config, enabled_models, deadline):
    """Revisor de contenido: detecta texto fuera de tema/incorrecto y reescribe solo esos campos."""
    if fake:
        return data, None
    return review_and_fix(
        concept, data, spec.schema(params), deadline=deadline, llm_config=llm_config, enabled_models=enabled_models
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

    from ova_engine.planner_attrs import normalize_topic

    t0 = time.monotonic()
    # El docente escribe «Tema. Objetivo: … Nivel educativo: …»: el tema núcleo va a
    # títulos, decisión y revisor; el pedido completo llega al LLM como contexto.
    request = " ".join(concept.split())
    concept, _ = normalize_topic(request)
    prompt_ctx = contexto
    if concept != request:
        pedido = f"Pedido del docente (respeta su objetivo y nivel): {request}"
        prompt_ctx = f"{pedido}\n\n{contexto}" if contexto else pedido
    params = decide(spec, concept, contexto, override=resource_config)
    if fake:
        data = spec.sample(concept, params)
    else:
        data = generate_json(
            spec.prompt(concept, prompt_ctx, params),
            spec.schema(params),
            llm_config=llm_config,
            enabled_models=enabled_models,
            deadline=deadline,
        )
    t_text = time.monotonic()
    data, review = _review_step(spec, concept, params, data, fake, llm_config, enabled_models, deadline)
    t_review = time.monotonic()
    # Recursos de video (engage 2, explore 4, explain 1): el video se encarga con el
    # guion (`prompt_video` del JSON) y se genera en paralelo al render.
    pending_video = None
    if not fake:
        from prometheus.plans.video_step import start_video

        pending_video = start_video(spec.phase, spec.rt, concept, data, llm_config)
    replacements: dict[str, str] = {}
    if spec.uses_images and not image_settings and os.getenv("LOCAL_IMAGE_URL"):
        # Desarrollo/QA: el servidor local de imágenes (SD) hace de proveedor.
        image_settings = {"provider": "local", "max_images": int(os.getenv("OVA_MAX_GENERATED_IMAGES", "6"))}
    if spec.uses_images and image_settings and image_settings.get("enabled", True):
        from llm.images.image_enrich import enrich_with_images
        from llm.images.style_guide import CHARACTERS

        try:
            replacements = enrich_with_images(
                data,
                image_settings,
                character=CHARACTERS.get(spec.image_character, ""),
                ova_key=concept,
            )
        except Exception as exc:  # la imagen nunca tumba el recurso
            logger.warning("ova engine images failed", key=spec.key, error=str(exc)[:200])
    html = resolve_image_placeholders(
        render_resource(spec, data, concept, params, theme, review.summary() if review else None), replacements
    )
    if pending_video is not None:
        from prometheus.plans.video_step import attach_video

        html = attach_video(html, pending_video)
    logger.info(
        "ova engine resource",
        key=spec.key,
        params=params,
        text_s=round(t_text - t0, 2),
        review_s=round(t_review - t_text, 2),
        review_found=len(review.found) if review else 0,
        review_fixed=review.fixed if review else 0,
        total_s=round(time.monotonic() - t0, 2),
        images=len(replacements),
    )
    return html, data
