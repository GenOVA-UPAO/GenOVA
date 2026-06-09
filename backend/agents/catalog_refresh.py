"""Fetch model metadata from OpenRouter and Groq APIs, merge with the curated
allowlist (model_catalog.CATALOG_ENTRIES), cache in Supabase and keep a fast
in-memory copy for request-time reads.

lifespan calls `refresh_catalog` at startup; endpoint users also hit the cache
via `get_catalog_entries()`.
"""

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import RLock

import httpx

from agents.model_catalog import CATALOG_ENTRIES, _rebuild_catalog

logger = logging.getLogger(__name__)

# Default, override via OPENROUTER_API_BASE / GROQ_API_BASE env vars.
_OR_API = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

# In-memory cache — built on startup, read by every request (no DB hit).
# Thread-safe: written only by the refresh thread, guarded by _CL.
_catalog: list[dict] = list(CATALOG_ENTRIES)
_full_catalog: list[dict] = [
    {
        "provider": e["provider"],
        "model_id": e["model_id"],
        "label": e["label"],
        "category": e.get("task") or "texto",
        "pricing": e.get("pricing"),
        "context_length": e.get("context_length"),
        "curated": True,
        "active": True,
        "task": e.get("task"),
    }
    for e in CATALOG_ENTRIES
]
_CL = RLock()

_CATALOG_REFRESH_TIMEOUT = float(os.getenv("CATALOG_REFRESH_TIMEOUT_S", "15"))

_CURATED_KEYS: set[tuple[str, str]] = {(e["provider"], e["model_id"]) for e in CATALOG_ENTRIES}

MODALITY_CATEGORY = {
    "text": "texto",
    "multimodal": "multimodal",
    "image": "imagen",
    "embedding": "embedding",
    "audio": "audio",
}

_CODIGO_KEYWORDS = (
    "coder",
    "code",
    "dev",
    "programming",
    "claude",
    "gpt-4",
    "deepseek",
    "gemini-pro",
    "gemini-flash",
    "o1",
    "o3",
    "o4",
)

_RAZONAMIENTO_KEYWORDS = (
    "r1",
    "reasoning",
    "think",
    "gpt-oss",
    "gpt-5",
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


def get_catalog_entries() -> list[dict]:
    """Return the current merged catalog (fast path — in-memory)."""
    with _CL:
        return list(_catalog)


def get_full_catalog_entries() -> list[dict]:
    """Return ALL models from both providers with categories and pricing."""
    with _CL:
        return list(_full_catalog)


def _build_full_catalog(or_data: dict[str, dict], groq_ids: set[str]) -> list[dict]:
    curated_keys = _CURATED_KEYS
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

    result.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
    return result


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


def _fetch_openrouter() -> dict[str, dict]:
    """Fetch the full model list from OpenRouter. Returns {model_id: raw_entry}."""
    url = f"{_OR_API}/models"
    logger.info("Fetching OpenRouter model list from %s", url)
    try:
        resp = httpx.get(url, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.exception("OpenRouter model list fetch failed")
        return {}

    models = {}
    for m in data.get("data", []):
        mid = m.get("id")
        if mid:
            models[mid] = m
    logger.info("OpenRouter returned %d models", len(models))
    return models


def _fetch_groq() -> set[str]:
    """Fetch the available model ids from Groq. Returns a set of model_id strings."""
    try:
        from agents.llm_router import groq_client

        resp = groq_client.models.list()
        ids = {m.id for m in resp.data if m.id}
        logger.info("Groq returned %d models", len(ids))
        return ids
    except Exception:
        logger.exception("Groq model list fetch failed")
        return set()


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


def refresh_catalog(db=None) -> None:
    """Fetch provider APIs in parallel, merge into CATALOG_ENTRIES, rebuild CATALOG,
    optionally persist to cache, and update the in-memory copy.

    `db` is an optional SQLAlchemy Session — if provided, we read/write Supabase
    cache. Called from lifespan with a fresh session, or from the admin endpoint.
    """
    global _catalog

    # Fetch both providers in parallel.
    or_data: dict = {}
    groq_ids: set = set()
    with ThreadPoolExecutor(max_workers=2) as pool:
        f_or = pool.submit(_fetch_openrouter)
        f_groq = pool.submit(_fetch_groq)
        for future in as_completed([f_or, f_groq], timeout=_CATALOG_REFRESH_TIMEOUT + 5):
            if future is f_or:
                try:
                    or_data = future.result()
                except Exception:
                    logger.exception("OpenRouter fetch timed out or failed")
            elif future is f_groq:
                try:
                    groq_ids = future.result()
                except Exception:
                    logger.exception("Groq fetch timed out or failed")

    _merge_openrouter(or_data)
    _merge_groq(groq_ids)
    _rebuild_catalog()

    full = _build_full_catalog(or_data, groq_ids)

    with _CL:
        _catalog = list(CATALOG_ENTRIES)
        if full:
            _full_catalog = full
    logger.info(
        "In-memory catalog updated (%d curated | %d total)", len(_catalog), len(full) if full else 0
    )

    # Persist raw API data to Supabase cache.
    if db and (or_data or groq_ids):
        try:
            from agents.catalog_cache import save_to_cache

            if or_data:
                save_to_cache(db, "openrouter", {"models": or_data})
            if groq_ids:
                save_to_cache(db, "groq", {"models": list(groq_ids)})
        except Exception:
            logger.exception("Failed to save catalog cache to DB")
