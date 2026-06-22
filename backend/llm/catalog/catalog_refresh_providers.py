"""Provider-specific helpers for catalog_refresh: fetch, merge, build, and
cache logic for OpenRouter and Groq providers."""

import logging
import os

import httpx

from llm.catalog.catalog_pricing import format_pricing, format_pricing_detail
from llm.catalog.model_catalog import CATALOG_ENTRIES

logger = logging.getLogger(__name__)

_OR_API = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")



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
    """Fetch available Groq model ids. Resolves key via platform_config → env var."""
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key

    db = SessionLocal()
    try:
        api_key = resolve_key("groq", None, db)
    finally:
        db.close()

    if not api_key:
        logger.info("Groq: no API key configured — skipping model list fetch")
        return None
    try:
        from groq import Groq

        resp = Groq(api_key=api_key, max_retries=0).models.list()
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
            entry["pricing_detail"] = format_pricing_detail(pricing)
            entry["context_length"] = m.get("context_length")
            entry["description"] = (m.get("description") or "").strip()[:200]
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


def _merge_opencode(available_ids: set[str]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "opencode":
            continue
        entry["active"] = entry["model_id"] in available_ids


def _fetch_opencode() -> set[str] | None:
    """Fetch OpenCode model ids. Resolves key via platform_config → env var."""
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key

    db = SessionLocal()
    try:
        api_key = resolve_key("opencode", None, db)
    finally:
        db.close()

    if not api_key:
        logger.info("OpenCode: no API key configured — skipping model list fetch")
        return None
    try:
        from openai import OpenAI

        resp = OpenAI(api_key=api_key, base_url="https://opencode.ai/zen/go/v1", max_retries=0, timeout=10.0).models.list()
        ids = {m.id for m in resp.data if m.id}
        logger.info("OpenCode returned %d models", len(ids))
        return ids
    except Exception:
        logger.exception("OpenCode model list fetch failed")
        return None


def _load_cached(db, provider: str) -> dict | set | None:
    """Read a provider's raw data back from the Supabase cache. Defensive: a
    missing/expired row or an unexpected shape must never break the refresh."""
    if db is None:
        return None
    try:
        from llm.catalog.catalog_cache import load_from_cache

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
