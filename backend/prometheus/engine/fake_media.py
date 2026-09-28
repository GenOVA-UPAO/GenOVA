"""Medios simulados en el modo LLM_FAKE=1.

El motor fake sustituye el HTML de cada recurso por un stub, pero los medios
recorren el camino real hasta la llamada al proveedor: la cadena de imagen que
se resolvió al crear el job (`image_settings`) y la cadena de video de la tarea
Video (`video_step`), con sus claves y respaldos. Solo la petición al proveedor
es simulada (`llm.images.media_fake`): así se comprueba, sin coste, que el
modelo elegido en /models es el que se usa y que los respaldos entran cuando el
principal falla.

Como en el motor real: imágenes solo en el cómic de enganche (el único recurso
con `prompt_imagen`) y video solo en los recursos de video, si la tarea está
activa.
"""

from __future__ import annotations

import html as html_lib
import re

import structlog

logger = structlog.get_logger(__name__)

_H1_END = re.compile(r"</h1\s*>", re.IGNORECASE)
_IMAGE_RESOURCES = {("engage", 1)}


def _after_h1(html: str, block: str) -> str:
    match = _H1_END.search(html)
    if not match:
        return block + html
    return html[: match.end()] + block + html[match.end() :]


def _with_image(html: str, phase: str, rt: int, concept: str, image_settings: dict | None) -> str:
    if (phase, rt) not in _IMAGE_RESOURCES or not image_settings:
        return html
    from llm.images.image_enrich import enrich_with_images

    items = [{"prompt_imagen": f"Flat cartoon illustration about {concept}"}]
    replacements = enrich_with_images(items, image_settings)
    uri = replacements.get(items[0].get("image_placeholder", ""))
    if not uri:
        return html
    alt = html_lib.escape(f"Ilustración de {concept}", quote=True)
    block = f'<figure data-llm-fake-image="1"><img src="{uri}" alt="{alt}" width="512" height="512"></figure>'
    return _after_h1(html, block)


def _with_video(html: str, phase: str, rt: int, concept: str, llm_config: dict | None) -> str:
    from prometheus.plans.video_step import attach_video, start_video

    json_data = {"prompt_video": f"Short educational video about {concept}"}
    return attach_video(html, start_video(phase, rt, concept, json_data, llm_config))


def with_fake_media(
    html: str,
    phase: str,
    rt,
    concept: str,
    image_settings: dict | None,
    llm_config: dict | None,
) -> str:
    """HTML del stub con la imagen y/o el video simulados que tocan. Nunca lanza."""
    try:
        n = int(rt)
    except (TypeError, ValueError):
        return html
    try:
        html = _with_image(html, phase, n, concept, image_settings)
        return _with_video(html, phase, n, concept, llm_config)
    except Exception:  # noqa: BLE001 — como en real: el recurso sale igual
        logger.exception("fake media failed", phase=phase, resource_type=n)
        return html
