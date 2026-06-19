"""Provider-specific helpers for catalog_refresh: fetch, merge, build, and
cache logic for OpenRouter and Groq providers."""

import logging
import os

import httpx

from llm.model_catalog import CATALOG_ENTRIES

logger = logging.getLogger(__name__)

_OR_API = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

MODALITY_CATEGORY = {
    "text": "texto",
    "multimodal": "multimodal",
    "image": "imagen",
    "embedding": "embedding",
    "audio": "audio",
}

_CODIGO_KEYWORDS = (
    "coder", "code", "dev", "programming",
    "claude", "gpt-4", "deepseek",
    "gemini-pro", "gemini-flash", "o1", "o3", "o4",
)

_RAZONAMIENTO_KEYWORDS = (
    "r1", "reasoning", "think", "gpt-oss", "gpt-5",
)


def categorize_model(api_entry: dict, provider: str) -> str:
    arch = api_entry.get("architecture") or {}
    modality = arch.get("modality", "text") if isinstance(arch, dict) else str(arch)
    category = MODALITY_CATEGORY.get(modality, "texto")
    mid = (api_entry.get("id") or "").lower()
    if category in ("texto", "multimodal"):
        if any(kw in mid for kw in _CODIGO_KEYWORDS):
            return "codigo"
        if any(kw in mid for kw in _RAZONAMIENTO_KEYWORDS):
            return "razonamiento"
    return category


def format_pricing(pricing: dict | None) -> str | None:
    """OpenRouter pricing is USD per 1 token — convert to human-friendly $/1M tokens."""
    if not pricing:
        return None
    prompt = pricing.get("prompt")
    completion = pricing.get("completion")
    if prompt is None and completion is None:
        return None

    def _per_m(val) -> float:
        try:
            v = float(val)
        except (TypeError, ValueError):
            return 0.0
        return round(v * 1_000_000, 2)

    pi = _per_m(prompt) if prompt else None
    co = _per_m(completion) if completion else None

    if pi is not None and co is not None:
        if pi == 0 and co == 0:
            return "Gratuito"
        if pi == 0:
            return f"Free in · ${co:.2f}/1M out"
        return f"${pi:.2f}/${co:.2f} por 1M tokens"
    return None


def _fetch_openrouter() -> dict[str, dict] | None:
    """Fetch the full model list from OpenRouter. Returns {model_id: raw_entry},
    or None when the fetch failed (so the caller can fall back instead of
    treating the provider as having zero models)."""
    url = f"{_OR_API}/models"
    logger.info("Fetching OpenRouter model list from %s", url)
    try:
        resp = httpx.get(url, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.exception("OpenRouter model list fetch failed")
        return None

    models = {}
    for m in data.get("data", []):
        mid = m.get("id")
        if mid:
            models[mid] = m
    logger.info("OpenRouter returned %d models", len(models))
    return models


def _fetch_groq() -> set[str] | None:
    """Fetch the available model ids from Groq. Returns a set of model_id strings,
    or None when the fetch failed."""
    try:
        from llm.router import groq_client

        resp = groq_client.models.list()
        ids = {m.id for m in resp.data if m.id}
        logger.info("Groq returned %d models", len(ids))
        return ids
    except Exception:
        logger.exception("Groq model list fetch failed")
        return None


def _merge_openrouter(api_models: dict[str, dict]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "openrouter":
            continue
        m = api_models.get(entry["model_id"])
        if m:
            pricing = m.get("pricing")
            entry["pricing"] = format_pricing(pricing)
            entry["context_length"] = m.get("context_length")
            entry["active"] = True
        else:
            logger.warning("OpenRouter model not found in API: %s", entry["model_id"])
            entry["active"] = False


def _merge_groq(available_ids: set[str]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "groq":
            continue
        if entry["model_id"] in available_ids:
            entry["active"] = True
        else:
            logger.warning("Groq model not found in API: %s", entry["model_id"])
            entry["active"] = False


def _build_full_catalog(or_data: dict[str, dict], groq_ids: set[str]) -> list[dict]:
    curated_keys = {(e["provider"], e["model_id"]) for e in CATALOG_ENTRIES}
    result: list[dict] = []

    for model_id, raw in or_data.items():
        curated = ("openrouter", model_id) in curated_keys
        result.append(
            {
                "provider": "openrouter",
                "model_id": model_id,
                "label": raw.get("name") or model_id,
                "category": categorize_model(raw, "openrouter"),
                "pricing": format_pricing(raw.get("pricing")),
                "context_length": raw.get("context_length"),
                "curated": curated,
                "active": True,
                "task": "codigo" if curated else None,
            }
        )

    for model_id in groq_ids:
        curated = ("groq", model_id) in curated_keys
        result.append(
            {
                "provider": "groq",
                "model_id": model_id,
                "label": model_id,
                "category": categorize_model(
                    {"id": model_id, "architecture": {"modality": "text"}}, "groq"
                ),
                "pricing": None,
                "context_length": 128000,
                "curated": curated,
                "active": True,
                "task": "texto" if curated else None,
            }
        )

    for entry in CATALOG_ENTRIES:
        if entry["provider"] not in ("openrouter", "groq") and entry["active"]:
            result.append(
                {
                    "provider": entry["provider"],
                    "model_id": entry["model_id"],
                    "label": entry["label"],
                    "category": entry.get("task") or "codigo",
                    "pricing": entry.get("pricing"),
                    "context_length": entry.get("context_length"),
                    "curated": (entry["provider"], entry["model_id"]) in curated_keys,
                    "active": True,
                    "task": entry.get("task"),
                }
            )

    result.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
    return result


def _load_cached(db, provider: str) -> dict | set | None:
    """Read a provider's raw data back from the Supabase cache. Defensive: a
    missing/expired row or an unexpected shape must never break the refresh."""
    if db is None:
        return None
    try:
        from llm.catalog_cache import load_from_cache

        raw = load_from_cache(db, provider)
    except Exception:
        logger.exception("Catalog cache read failed for provider=%s", provider)
        return None
    if not isinstance(raw, dict):
        return None
    models = raw.get("models")
    if provider == "openrouter":
        return models if isinstance(models, dict) and models else None
    if isinstance(models, (list, set)) and models:
        return {str(m) for m in models}
    return None
