"""Reglas puras de los ajustes LLM por usuario.

Filtrado de catálogo (curado + full), búsqueda/categoría/tipo y listas de
facetas. Todo el catálogo se INYECTA; `is_default_model` se sustituye por el
conjunto de claves por defecto, equivalente a su implementación en llm.
"""

from __future__ import annotations


def enabled_keys(enabled_models: list) -> set[tuple[str, str]]:
    """Set of (provider, model_id) the user has explicitly enabled."""
    return {(e["provider"], e["model_id"]) for e in enabled_models if isinstance(e, dict)}


def build_filtered_catalog(
    all_entries: list[dict],
    full_entries: list[dict],
    enabled: set[tuple[str, str]],
    default_keys: set[tuple[str, str]],
) -> dict[str, list[dict]]:
    curated_key_set: set[tuple[str, str]] = set()
    filtered_catalog: dict[str, list[dict]] = {}
    for entry in all_entries:
        if not entry.get("active"):
            continue
        p = entry["provider"]
        key = (p, entry["model_id"])
        curated_key_set.add(key)
        if key not in enabled and key not in default_keys:
            continue
        filtered_catalog.setdefault(p, []).append(entry)

    # Step 2: non-curated enabled models from the full catalog. A user who finds
    # and enables a model in the browser (e.g. qwen/qwen3-32b via OpenRouter)
    # must see it in the assignment dropdown even if it's not in CATALOG_ENTRIES.
    full_by_key = {(e["provider"], e["model_id"]): e for e in full_entries}
    for key in enabled:
        if key in curated_key_set:
            continue  # already handled above
        fc_entry = full_by_key.get(key)
        if fc_entry and fc_entry.get("active"):
            filtered_catalog.setdefault(fc_entry["provider"], []).append(fc_entry)

    return filtered_catalog


def filter_full_catalog(full: list[dict], search: str, category: str, model_type: str) -> list:
    if search:
        full = [
            e
            for e in full
            if search in e["model_id"].lower() or search in (e.get("label") or "").lower()
        ]
    if category == "recommended":
        full = [e for e in full if e.get("curated")]
    elif category and category != "all":
        full = [e for e in full if e.get("provider") == category]
    if model_type and model_type != "all":
        full = [e for e in full if e.get("category") == model_type]
    return full


def providers_and_types(active_entries: list[dict]) -> tuple[list[str], list[str]]:
    all_providers = sorted({e.get("provider", "") for e in active_entries if e.get("provider")})
    all_types = sorted({e.get("category", "texto") for e in active_entries})
    return all_providers, all_types
