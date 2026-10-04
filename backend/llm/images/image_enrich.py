"""Enrich engage JSON with generated images (HU-035 chain-aware)."""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor

import structlog

from llm.images import image_cache
from llm.images.image_compress import compress_data_uri
from llm.images.image_placeholder import IMG_PLACEHOLDER
from llm.images.image_providers import get_image_data_uri, hf_last_resort
from llm.images.media_fake import fake_media_enabled
from llm.images.style_guide import guide_from_settings

logger = structlog.get_logger(__name__)
_SIZE = 512  # get_image_data_uri genera 512x512 por defecto


def image_items(json_data) -> list[dict]:
    """Elementos con ``prompt_imagen`` (las viñetas del cómic, por ejemplo).

    El prompt pide un array, pero el modelo a veces lo envuelve en un objeto
    (``{"viñetas": [...]}``) o devuelve una sola viñeta: se aceptan las tres
    formas. Los elementos mutan después (``image_placeholder``), así que se
    devuelven los mismos diccionarios, no copias.
    """
    if isinstance(json_data, dict):
        if "prompt_imagen" in json_data:
            return [json_data]
        for value in json_data.values():
            items = image_items(value) if isinstance(value, list) else []
            if items:
                return items
        return []
    if isinstance(json_data, list):
        return [item for item in json_data if isinstance(item, dict) and "prompt_imagen" in item]
    return []


def enrich_with_images(
    json_data,
    image_settings: dict | None = None,
    *,
    character: str = "",
    ova_key: str = "",
) -> dict[str, str]:
    """Fetch images for items with ``prompt_imagen``; inject placeholders.

    ``image_settings``: max_images, provider, api_key, image_model, chain?, enabled?
    When ``chain`` is set, tries each entry until one succeeds.

    Todas las imágenes del OVA comparten la guía de estilo (``image_settings['style_guide']``,
    fijada al crear el job, o derivada de ``ova_key``) y, si el recurso tiene personaje
    (``character``), su descripción fija. La misma imagen (prompt+estilo+modelo+tamaño) sale
    de la caché de disco en vez de regenerarse.
    """
    json_data = image_items(json_data)
    if not json_data:
        # Antes salía en silencio: un OVA sin imágenes no dejaba rastro de por qué.
        logger.info("image enrichment skipped: no prompt_imagen in resource JSON")
        return {}

    settings = image_settings or {}
    if settings.get("enabled") is False:
        return {}
    default_max = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))
    max_images = int(settings.get("max_images", default_max))
    provider = settings.get("provider", "cloudflare")
    api_key = settings.get("api_key") or None
    model = settings.get("image_model") or None
    chain = settings.get("chain") or []

    if max_images <= 0 or provider in (None, "", "none"):
        return {}

    guide = guide_from_settings(settings, ova_key)
    style = f"{guide.prefix}|{guide.suffix}|{character}"
    use_cache = image_cache.enabled() and not fake_media_enabled()

    def _one(scene: str) -> str | None:
        key = image_cache.cache_key(scene, style, f"{provider}:{model or ''}", _SIZE, _SIZE)
        if use_cache and (cached := image_cache.get(key)):
            return cached
        uri = _generate(guide.apply(scene, character), guide.seed)
        if uri and use_cache:
            image_cache.put(key, uri)
        return uri

    def _generate(prompt: str, seed: int) -> str | None:
        if not chain:
            return get_image_data_uri(prompt, provider, api_key, model=model, seed=seed)
        # Principal y respaldos en orden; HuggingFace solo cuando falló toda la
        # cadena (antes se colaba entre el principal y el primer respaldo).
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

    targets = json_data[:max_images]
    prompts = [(item.get("prompt_imagen") or "").strip() for item in targets]
    with ThreadPoolExecutor(max_workers=2) as pool:
        uris = [compress_data_uri(uri) for uri in pool.map(_one, prompts)]

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
