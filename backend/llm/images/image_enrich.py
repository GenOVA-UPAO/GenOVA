"""Enrich engage JSON with generated images (HU-035 chain-aware)."""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor

from llm.images.image_providers import IMG_PLACEHOLDER, get_image_data_uri


def enrich_with_images(json_data, image_settings: dict | None = None) -> dict[str, str]:
    """Fetch images for items with ``prompt_imagen``; inject placeholders.

    ``image_settings``: max_images, provider, api_key, image_model, chain?, enabled?
    When ``chain`` is set, tries each entry until one succeeds.
    """
    if not isinstance(json_data, list) or not json_data:
        return {}
    first = json_data[0] if isinstance(json_data[0], dict) else None
    if not first or "prompt_imagen" not in first:
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

    def _one(prompt: str) -> str | None:
        if not chain:
            return get_image_data_uri(prompt, provider, api_key, model=model)
        for entry in chain:
            if not isinstance(entry, dict):
                continue
            p, m = entry.get("provider"), entry.get("model_id")
            if not p:
                continue
            key = api_key if p == provider else entry.get("api_key")
            uri = get_image_data_uri(prompt, p, key, model=m)
            if uri:
                return uri
        return None

    targets = json_data[:max_images]
    prompts = [(item.get("prompt_imagen") or "").strip() for item in targets]
    with ThreadPoolExecutor(max_workers=2) as pool:
        uris = list(pool.map(_one, prompts))

    replacements: dict[str, str] = {}
    for i, (item, uri) in enumerate(zip(targets, uris, strict=True), start=1):
        placeholder = f"__IMG_{i}__"
        item["image_placeholder"] = placeholder
        replacements[placeholder] = uri or IMG_PLACEHOLDER
    return replacements
