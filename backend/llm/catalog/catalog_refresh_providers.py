"""Provider-specific helpers for catalog_refresh: fetch, merge, build, and
cache logic for OpenRouter and Groq providers."""


import httpx
import structlog

from core import openrouter
from llm.catalog.catalog_pricing import format_pricing, format_pricing_detail
from llm.catalog.model_catalog import CATALOG_ENTRIES
from llm.catalog.provider_listing import (
    list_groq_ids,
    list_huggingface_ids,
    list_opencode_ids,
    log_listing_failure,
)

logger = structlog.get_logger(__name__)



class ProviderNotConfiguredError(Exception):
    """The provider has no platform API key, so its model list is not fetched.

    That is an expected state ("not connected"), not a failure: the refresh
    reports it apart so the UI can offer to connect the provider instead of
    warning that its catalog could not be fetched.
    """


def _platform_key(provider: str) -> str | None:
    """Platform-level key for `provider` (platform_config → env var)."""
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key

    db = SessionLocal()
    try:
        return resolve_key(provider, None, db)
    finally:
        db.close()


def has_platform_key(provider: str) -> bool:
    """True when the platform has a key for `provider`. Never raises."""
    try:
        return _platform_key(provider) is not None
    except Exception:
        logger.exception("platform key lookup failed", provider=provider)
        return False


def _fetch_openrouter() -> dict[str, dict] | None:
    """Fetch the full model list from OpenRouter. Returns {model_id: raw_entry},
    or None when the fetch failed (so the caller can fall back instead of
    treating the provider as having zero models)."""
    url = openrouter.api_url("models")
    logger.info("fetching model list", provider="openrouter", url=url)
    try:
        resp = httpx.get(url, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.exception("model list fetch failed", provider="openrouter")
        return None

    models = {}
    for m in data.get("data", []):
        mid = m.get("id")
        if mid:
            models[mid] = m
    logger.info("model list fetched", provider="openrouter", count=len(models))
    return models


def _fetch_groq() -> set[str] | None:
    """Fetch available Groq model ids. Resolves key via platform_config → env var.
    Raises ProviderNotConfiguredError when there is no key."""
    api_key = _platform_key("groq")
    if not api_key:
        logger.info("no API key configured — skipping model list fetch", provider="groq")
        raise ProviderNotConfiguredError("groq")
    try:
        ids = list_groq_ids(api_key)
    except Exception as exc:
        log_listing_failure("groq", exc)
        return None
    logger.info("model list fetched", provider="groq", count=len(ids))
    return ids


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
            logger.warning("model not found in API", provider="openrouter", model_id=entry["model_id"])
            entry["active"] = False


def _merge_groq(available_ids: set[str]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "groq":
            continue
        if entry["model_id"] in available_ids:
            entry["active"] = True
        else:
            logger.warning("model not found in API", provider="groq", model_id=entry["model_id"])
            entry["active"] = False


def _merge_opencode(available_ids: set[str]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "opencode":
            continue
        entry["active"] = entry["model_id"] in available_ids


def _fetch_opencode() -> set[str] | None:
    """Fetch OpenCode model ids. Resolves key via platform_config → env var.
    Raises ProviderNotConfiguredError when there is no key."""
    api_key = _platform_key("opencode")
    if not api_key:
        logger.info("no API key configured — skipping model list fetch", provider="opencode")
        raise ProviderNotConfiguredError("opencode")
    try:
        ids = list_opencode_ids(api_key)
    except Exception as exc:
        log_listing_failure("opencode", exc)
        return None
    logger.info("model list fetched", provider="opencode", count=len(ids))
    return ids


def _fetch_huggingface() -> set[str] | None:
    """Fetch text-generation model IDs warm for HF Serverless Inference.
    Raises ProviderNotConfiguredError when there is no key."""
    api_key = _platform_key("huggingface")
    if not api_key:
        logger.info("no API key — skipping text model fetch", provider="huggingface")
        raise ProviderNotConfiguredError("huggingface")
    try:
        # La lista es pública: la plataforma la pide sin cabecera, como antes.
        ids = list_huggingface_ids()
    except Exception as exc:
        log_listing_failure("huggingface", exc)
        return None
    logger.info("warm text models fetched", provider="huggingface", count=len(ids))
    return ids


def _merge_huggingface(available_ids: set[str]) -> None:
    for entry in CATALOG_ENTRIES:
        if entry["provider"] != "huggingface":
            continue
        entry["active"] = entry["model_id"] in available_ids


def _load_cached(db, provider: str) -> dict | set | None:
    """Read a provider's raw data back from the Supabase cache. Defensive: a
    missing/expired row or an unexpected shape must never break the refresh."""
    if db is None:
        return None
    try:
        from llm.catalog.catalog_cache import load_from_cache

        raw = load_from_cache(db, provider)
    except Exception:
        logger.exception("catalog cache read failed", provider=provider)
        return None
    if not isinstance(raw, dict):
        return None
    models = raw.get("models")
    if provider == "openrouter":
        return models if isinstance(models, dict) and models else None
    if isinstance(models, (list, set)) and models:
        return {str(m) for m in models}
    return None
