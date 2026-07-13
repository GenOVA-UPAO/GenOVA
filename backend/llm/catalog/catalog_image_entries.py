"""Build catalog rows for native image providers (HF / SiliconFlow / Runware / fal.ai).

Curated static lists are always included so the unified catalog works without keys;
live API lists replace/enrich them when credentials exist.
"""

from __future__ import annotations

import structlog

from llm.catalog.catalog_aptitudes import aptitudes_for
from llm.images.image_model_list import (
    FALAI_MODELS,
    HF_IMAGE_MODELS_FALLBACK,
    RUNWARE_MODELS,
    SILICONFLOW_MODELS,
    _fetch_huggingface_image_models,
    _fetch_siliconflow,
)

logger = structlog.get_logger(__name__)

IMAGE_CATALOG_PROVIDERS = ("huggingface", "siliconflow", "runware", "falai")


def _row(provider: str, model_id: str, label: str, *, curated: bool = True) -> dict:
    return {
        "provider": provider,
        "model_id": model_id,
        "label": label or model_id,
        "description": "",
        "category": "imagen",
        "modality": "image",
        "pricing": None,
        "pricing_detail": None,
        "context_length": None,
        "curated": curated,
        "active": True,
        "task": "imagen",
        "aptitudes": aptitudes_for("imagen", "image"),
    }


def _from_static(provider: str, models: list[dict]) -> list[dict]:
    return [_row(provider, m["id"], m.get("label") or m["id"]) for m in models if m.get("id")]


def curated_image_entries() -> list[dict]:
    """Preload image catalog without requiring API keys."""
    rows: list[dict] = []
    rows.extend(_from_static("huggingface", HF_IMAGE_MODELS_FALLBACK))
    rows.extend(_from_static("siliconflow", SILICONFLOW_MODELS))
    rows.extend(_from_static("runware", RUNWARE_MODELS))
    rows.extend(_from_static("falai", FALAI_MODELS))
    return rows


def fetch_image_provider_entries(keys: dict[str, str | None]) -> dict[str, list[dict] | None]:
    """Fetch per-provider image lists. None = fetch failed (keep previous / curated)."""
    result: dict[str, list[dict] | None] = {}

    # HuggingFace Hub text-to-image — no key required for listing.
    try:
        hf = _fetch_huggingface_image_models()
        result["huggingface"] = _from_static("huggingface", hf) if hf else None
    except Exception:
        logger.exception("image catalog fetch failed", provider="huggingface")
        result["huggingface"] = None

    sf_key = keys.get("siliconflow")
    if sf_key:
        try:
            sf = _fetch_siliconflow(sf_key)
            result["siliconflow"] = (
                [_row("siliconflow", m["id"], m.get("label") or m["id"], curated=False) for m in sf]
                if sf
                else []
            )
        except Exception:
            logger.exception("image catalog fetch failed", provider="siliconflow")
            result["siliconflow"] = None
    else:
        result["siliconflow"] = None

    # Runware / fal.ai: curated lists; mark ok when key present or always include curated.
    result["runware"] = _from_static("runware", RUNWARE_MODELS)
    result["falai"] = _from_static("falai", FALAI_MODELS)
    return result


def merge_image_entries(
    curated: list[dict],
    fetched: dict[str, list[dict] | None],
) -> list[dict]:
    """Prefer live fetch per provider; fall back to curated for that provider."""
    by_provider: dict[str, list[dict]] = {}
    for e in curated:
        by_provider.setdefault(e["provider"], []).append(e)

    out: list[dict] = []
    for provider in IMAGE_CATALOG_PROVIDERS:
        live = fetched.get(provider)
        if live is not None and len(live) > 0:
            out.extend(live)
        else:
            out.extend(by_provider.get(provider, []))
    return out
