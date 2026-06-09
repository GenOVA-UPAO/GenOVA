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
_CL = RLock()

_CATALOG_REFRESH_TIMEOUT = float(os.getenv("CATALOG_REFRESH_TIMEOUT_S", "15"))


def get_catalog_entries() -> list[dict]:
    """Return the current merged catalog (fast path — in-memory)."""
    with _CL:
        return list(_catalog)


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

    with _CL:
        _catalog = list(CATALOG_ENTRIES)
    logger.info("In-memory catalog updated (%d entries)", len(_catalog))

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
