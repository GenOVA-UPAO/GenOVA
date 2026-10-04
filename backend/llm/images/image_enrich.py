"""Enrich OVA JSON with images from router (search, logos, diagrams) or generator (HU-035 chain-aware)."""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import structlog

from llm.images import image_cache
from llm.images.image_compress import compress_data_uri
from llm.images.image_placeholder import IMG_PLACEHOLDER
from llm.images.image_providers import get_image_data_uri, hf_last_resort
from llm.images.media_fake import fake_media_enabled
from llm.images.style_guide import guide_from_settings

logger = structlog.get_logger(__name__)
_SIZE = 512  # get_image_data_uri genera 512x512 por defecto


def format_credit_caption(credit: Any) -> str:
    """Formatea la atribución requerida para imágenes de terceros en el pie de figura."""
    if not credit:
        return ""
    from ova_engine.html import esc

    author = esc(getattr(credit, "author", "") or "Autor")
    license_name = esc(getattr(credit, "license", "") or "Licencia libre")
    license_url = esc(getattr(credit, "license_url", "") or "#")
    provider = esc(getattr(credit, "provider", "") or "web")
    source_url = esc(getattr(credit, "source_url", "") or "#")

    return (
        f'<figcaption class="ova-image-credit">'
        f'<span>{author}</span> · '
        f'<a href="{license_url}" target="_blank" rel="noopener noreferrer">{license_name}</a> · '
        f'<a href="{source_url}" target="_blank" rel="noopener noreferrer">{provider}</a>'
        f'</figcaption>'
    )


def image_items(json_data: Any) -> list[dict]:
    """Elementos con ``prompt_imagen`` (cómic tradicional) o ``imagen`` (contrato nuevo).

    El prompt pide un array, pero el modelo a veces lo envuelve en un objeto
    (``{"viñetas": [...]}``) o devuelve una sola viñeta: se aceptan las tres
    formas. Los elementos mutan después (``image_placeholder``), así que se
    devuelven los mismos diccionarios, no copias.
    """
    if isinstance(json_data, dict):
        if "prompt_imagen" in json_data or "imagen" in json_data:
            return [json_data]
        for value in json_data.values():
            items = image_items(value) if isinstance(value, list) else []
            if items:
                return items
        return []
    if isinstance(json_data, list):
        return [
            item
            for item in json_data
            if isinstance(item, dict) and ("prompt_imagen" in item or "imagen" in item)
        ]
    return []


def enrich_with_images(
    json_data: Any,
    image_settings: dict | None = None,
    *,
    character: str = "",
    ova_key: str = "",
    template_key: str = "",
) -> dict[str, str]:
    """Fetch images for items with ``imagen`` (via ImageRouter) or ``prompt_imagen``; inject placeholders.

    ``image_settings``: max_images, provider, api_key, image_model, chain?, enabled?
    Los ítems con ``imagen`` usan el decisor (búsqueda web, logos, diagramas con fallback a generación).
    Los ítems que solo tienen ``prompt_imagen`` (cómic) mantienen su flujo habitual de generación guiada.
    """
    items = image_items(json_data)
    if not items:
        logger.info("image enrichment skipped: no image fields in resource JSON")
        return {}

    settings = image_settings or {}
    if settings.get("enabled") is False:
        return {}
    default_max = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))
    max_images = int(settings.get("max_images", default_max))
    if max_images <= 0:
        return {}

    provider = settings.get("provider", "cloudflare")
    api_key = settings.get("api_key") or None
    model = settings.get("image_model") or None
    chain = settings.get("chain") or []

    guide = guide_from_settings(settings, ova_key)
    style = f"{guide.prefix}|{guide.suffix}|{character}"
    use_cache = image_cache.enabled() and not fake_media_enabled()

    def _generate(prompt: str, seed: int) -> str | None:
        if not chain:
            return get_image_data_uri(prompt, provider, api_key, model=model, seed=seed)
        for entry in chain:
            if not isinstance(entry, dict):
                continue
            p, m = entry.get("provider"), entry.get("model_id")
            if not p:
                continue
            key = entry.get("api_key") or (api_key if p == provider else None)
            uri = get_image_data_uri(prompt, p, key, model=m, hf_fallback=False, seed=seed)
            if uri:
                return uri
            logger.info("image chain entry failed; trying next", provider=p, model=m)
        return hf_last_resort(prompt)

    def _one_generated(scene: str) -> str | None:
        key = image_cache.cache_key(scene, style, f"{provider}:{model or ''}", _SIZE, _SIZE)
        if use_cache and (cached := image_cache.get(key)):
            return cached
        uri = _generate(guide.apply(scene, character), guide.seed)
        if uri and use_cache:
            image_cache.put(key, uri)
        return uri

    def _process_item(item: dict) -> str | None:
        # 1. Rama nueva: el ítem declara un objeto 'imagen' estructurado
        if "imagen" in item and isinstance(item["imagen"], dict):
            from llm.images.sources.contract import ImageRequest
            from llm.images.sources.router import ImageRouter

            router = ImageRouter()
            req = ImageRequest.from_json(item["imagen"], concept=ova_key, template_key=template_key)
            try:
                res = router.route(
                    req,
                    image_settings=settings,
                    character=character,
                    ova_key=ova_key,
                )
                if res:
                    item["image_credit"] = res.credit
                    item["image_credit_html"] = format_credit_caption(res.credit)
                    item["image_source"] = res.source
                    item["image_alt"] = res.alt
                    item["image_meta"] = res.meta
                    return res.data_uri
            except Exception as exc:
                logger.warning("router image enrichment failed", error=str(exc)[:120])
            return None

        # 2. Rama cómic: elemento con solo prompt_imagen
        scene = (item.get("prompt_imagen") or "").strip()
        if not scene or provider in (None, "", "none"):
            return None
        return _one_generated(scene)

    targets = items[:max_images]
    with ThreadPoolExecutor(max_workers=2) as pool:
        uris = [compress_data_uri(uri) for uri in pool.map(_process_item, targets)]

    logger.info(
        "image enrichment",
        images=len(targets),
        style=guide.key,
        seed=guide.seed,
        cache=image_cache.stats(),
    )
    replacements: dict[str, str] = {}
    for i, (item, uri) in enumerate(zip(targets, uris, strict=True), start=1):
        placeholder = f"__IMG_{i}__"
        item["image_placeholder"] = placeholder
        replacements[placeholder] = uri or IMG_PLACEHOLDER
    return replacements
