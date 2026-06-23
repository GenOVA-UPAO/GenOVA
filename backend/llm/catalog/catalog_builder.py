"""Builds the full in-memory model catalog from provider API data.

Extracted from catalog_refresh_providers to keep file sizes under 200 lines.
"""

from llm.catalog.catalog_categorize import categorize_model
from llm.catalog.catalog_pricing import format_pricing, format_pricing_detail
from llm.catalog.model_catalog import CATALOG_ENTRIES


def _build_full_catalog(
    or_data: dict[str, dict],
    groq_ids: set[str],
    opencode_ids: set[str] | None = None,
    hf_ids: set[str] | None = None,
) -> list[dict]:
    curated_keys = {(e["provider"], e["model_id"]) for e in CATALOG_ENTRIES}
    result: list[dict] = []

    for model_id, raw in or_data.items():
        curated = ("openrouter", model_id) in curated_keys
        arch = raw.get("architecture") or {}
        modality = arch.get("modality", "text") if isinstance(arch, dict) else "text"
        pricing = raw.get("pricing")
        result.append({
            "provider": "openrouter",
            "model_id": model_id,
            "label": raw.get("name") or model_id,
            "description": (raw.get("description") or "").strip()[:200],
            "category": categorize_model(raw, "openrouter"),
            "modality": modality,
            "pricing": format_pricing(pricing),
            "pricing_detail": format_pricing_detail(pricing),
            "context_length": raw.get("context_length"),
            "curated": curated,
            "active": True,
            "task": "codigo" if curated else None,
        })

    for model_id in groq_ids:
        curated = ("groq", model_id) in curated_keys
        result.append({
            "provider": "groq",
            "model_id": model_id,
            "label": model_id,
            "description": "",
            "category": categorize_model({"id": model_id, "architecture": {"modality": "text"}}, "groq"),
            "modality": "text",
            "pricing": None,
            "pricing_detail": None,
            "context_length": 128000,
            "curated": curated,
            "active": True,
            "task": "texto" if curated else None,
        })

    if opencode_ids is not None:
        curated_oc = {e["model_id"] for e in CATALOG_ENTRIES if e["provider"] == "opencode"}
        for model_id in opencode_ids:
            curated = model_id in curated_oc
            result.append({
                "provider": "opencode",
                "model_id": model_id,
                "label": model_id,
                "description": "",
                "category": "codigo",
                "modality": "text",
                "pricing": None,
                "pricing_detail": None,
                "context_length": None,
                "curated": curated,
                "active": True,
                "task": "codigo" if curated else None,
            })
    else:
        for entry in CATALOG_ENTRIES:
            if entry["provider"] not in ("openrouter", "groq") and entry["active"]:
                result.append({
                    "provider": entry["provider"],
                    "model_id": entry["model_id"],
                    "label": entry["label"],
                    "description": "",
                    "category": entry.get("task") or "codigo",
                    "modality": entry.get("modality", "text"),
                    "pricing": entry.get("pricing"),
                    "pricing_detail": None,
                    "context_length": entry.get("context_length"),
                    "curated": (entry["provider"], entry["model_id"]) in curated_keys,
                    "active": True,
                    "task": entry.get("task"),
                })

    if hf_ids:
        curated_hf = {e["model_id"] for e in CATALOG_ENTRIES if e["provider"] == "huggingface"}
        for model_id in hf_ids:
            result.append({
                "provider": "huggingface",
                "model_id": model_id,
                "label": model_id,
                "description": "",
                "category": "texto",
                "modality": "text",
                "pricing": "Gratuito",
                "pricing_detail": None,
                "context_length": None,
                "curated": model_id in curated_hf,
                "active": True,
                "task": None,
            })

    result.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
    return result
