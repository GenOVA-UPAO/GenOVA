"""Resolve image/video generation settings from llm_config (+ legacy ova_settings).

HU-035: pipeline consumes the imagen chain from platform llm_config; one-shot
legacy map from ``ova_settings.image_*`` when the chain is still empty.
"""

from __future__ import annotations

import logging
import os

from llm.utils import llm_config_store

logger = logging.getLogger(__name__)

_DEFAULT_MAX = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))


def legacy_image_entry(ova_settings: dict | None) -> tuple[dict | None, bool]:
    """Map ova_settings.image_* → (entry|None, enabled).

    ``image_provider == "none"`` → disabled. Missing provider → no legacy entry.
    """
    s = ova_settings or {}
    provider = s.get("image_provider")
    if provider is None:
        return None, True
    if provider in ("", "none"):
        return None, False
    model = s.get("image_model")
    if not model:
        return {"provider": provider, "model_id": provider, "extra": {}}, True
    return {"provider": provider, "model_id": model, "extra": {}}, True


def imagen_chain(stored: dict | None = None, ova_settings: dict | None = None) -> list[dict]:
    """Primary + fallbacks for imagen; legacy ova_settings if store empty."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    defaults = (data or {}).get("defaults") or {}
    fallbacks = (data or {}).get("fallbacks") or {}
    chain: list[dict] = []
    primary = defaults.get("imagen")
    if isinstance(primary, dict) and primary.get("provider") and primary.get("model_id"):
        chain.append(primary)
    for fb in fallbacks.get("imagen") or []:
        if isinstance(fb, dict) and fb.get("provider") and fb.get("model_id"):
            chain.append(fb)
    if chain:
        return chain
    legacy, _ = legacy_image_entry(ova_settings)
    return [legacy] if legacy else []


def video_chain(stored: dict | None = None) -> list[dict]:
    """Primary + fallbacks for video task (empty if unconfigured)."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    defaults = (data or {}).get("defaults") or {}
    fallbacks = (data or {}).get("fallbacks") or {}
    chain: list[dict] = []
    primary = defaults.get("video")
    if isinstance(primary, dict) and primary.get("provider") and primary.get("model_id"):
        chain.append(primary)
    for fb in fallbacks.get("video") or []:
        if isinstance(fb, dict) and fb.get("provider") and fb.get("model_id"):
            chain.append(fb)
    return chain


def build_image_settings(
    *,
    ova_settings: dict | None,
    user_api_keys: dict | None,
    db,
    user_id=None,
) -> dict:
    """Settings for enrich_with_images: respects generation_enabled + chain."""
    from llm.clients.key_resolver import resolve_key

    stored = llm_config_store.stored_cached()
    flags_raw = (stored or {}).get("generation_enabled")
    if flags_raw is None and (ova_settings or {}).get("image_provider") == "none":
        enabled = False
    else:
        enabled = llm_config_store.generation_enabled("imagen", stored)

    chain = imagen_chain(stored, ova_settings)
    max_images = int((ova_settings or {}).get("max_images", _DEFAULT_MAX))
    if not enabled or max_images <= 0 or not chain:
        return {
            "max_images": 0,
            "provider": "none",
            "api_key": None,
            "image_model": None,
            "chain": [],
            "enabled": False,
        }

    primary = chain[0]
    provider = primary["provider"]
    return {
        "max_images": max_images,
        "provider": provider,
        "api_key": resolve_key(provider, user_api_keys or {}, db, user_id),
        "image_model": primary.get("model_id"),
        "chain": chain,
        "enabled": True,
    }


def should_generate_video(stored: dict | None = None) -> bool:
    """Video generation off by default; on only when switch + chain present."""
    data = stored if stored is not None else llm_config_store.stored_cached()
    if not llm_config_store.generation_enabled("video", data):
        return False
    return bool(video_chain(data))
