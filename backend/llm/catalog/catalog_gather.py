"""Refresh-orchestration helpers: parallel provider fetch with cache fallback,
plus dedupe/sort and cache-persist steps. Kept out of catalog_refresh so the
orchestrator stays a readable top-level flow.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed

import structlog

from llm.catalog.catalog_refresh_providers import (
    ProviderNotConfiguredError,
    _fetch_groq,
    _fetch_huggingface,
    _fetch_opencode,
    _fetch_openrouter,
    _load_cached,
    has_platform_key,
)

logger = structlog.get_logger(__name__)

PROVIDERS = ("openrouter", "groq", "opencode", "huggingface")
_DATA_KEYS = {
    "openrouter": "or_data",
    "groq": "groq_ids",
    "opencode": "opencode_ids",
    "huggingface": "hf_ids",
}


def _gather_provider_data(
    db, timeout: float
) -> tuple[dict, dict[str, str | None], dict[str, bool]]:
    """Fetch every provider in parallel; fall back to the DB cache for any that
    fail. Returns ({or_data, groq_ids, opencode_ids, hf_ids}, {provider: source},
    {provider: configured}).

    `source` is "api" | "cache" | None (None = no usable data → keep previous).
    `configured` is False when the platform has no key for the provider: its
    list was not fetched on purpose, which the UI shows as "not connected"
    rather than as a failure. OpenRouter's list is public, so it is always
    fetched, but it still counts as not connected without a key.
    """
    fetchers = {
        "openrouter": _fetch_openrouter,
        "groq": _fetch_groq,
        "opencode": _fetch_opencode,
        "huggingface": _fetch_huggingface,
    }
    results: dict[str, dict | set | None] = dict.fromkeys(PROVIDERS)
    configured: dict[str, bool] = dict.fromkeys(PROVIDERS, True)
    with ThreadPoolExecutor(max_workers=len(PROVIDERS) + 1) as pool:
        futures = {pool.submit(fn): provider for provider, fn in fetchers.items()}
        or_key = pool.submit(has_platform_key, "openrouter")
        try:
            for future in as_completed(futures, timeout=timeout + 5):
                provider = futures[future]
                try:
                    results[provider] = future.result()
                except ProviderNotConfiguredError:
                    configured[provider] = False
                except Exception:
                    logger.exception("model list fetch crashed", provider=provider)
        except TimeoutError:
            logger.exception("catalog provider fetch timed out")
        try:
            configured["openrouter"] = or_key.result(timeout=timeout)
        except Exception:
            logger.exception("platform key lookup timed out", provider="openrouter")

    sources: dict[str, str | None] = {
        provider: "api" if results[provider] is not None else None for provider in PROVIDERS
    }
    for provider in PROVIDERS:
        if results[provider] is None:
            cached = _load_cached(db, provider)
            if cached is not None:
                results[provider], sources[provider] = cached, "cache"

    data = {_DATA_KEYS[provider]: results[provider] for provider in PROVIDERS}
    return data, sources, configured


def _dedupe_and_sort(full: list[dict]) -> list[dict]:
    """Drop duplicate (provider, model_id) entries and sort curated-first."""
    seen_keys: set[tuple[str, str]] = set()
    deduped: list[dict] = []
    for e in full:
        key = (e["provider"], e["model_id"])
        if key not in seen_keys:
            seen_keys.add(key)
            deduped.append(e)
    deduped.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
    return deduped


def _persist_api_cache(db, sources: dict[str, str | None], data: dict) -> None:
    """Save freshly-fetched provider data to the Supabase cache (never cache reads)."""
    from llm.catalog.catalog_cache import save_to_cache

    if sources["openrouter"] == "api" and data["or_data"]:
        save_to_cache(db, "openrouter", {"models": data["or_data"]})
    if sources["groq"] == "api" and data["groq_ids"]:
        groq = data["groq_ids"]
        # `meta` (nombre, modalidades, contexto) sirve para no volver a ofrecer
        # los modelos de voz como de texto cuando el catálogo sale de la caché.
        meta = dict(groq) if isinstance(groq, dict) else None
        save_to_cache(db, "groq", {"models": list(groq), "meta": meta})
    if sources["opencode"] == "api" and data["opencode_ids"]:
        save_to_cache(db, "opencode", {"models": list(data["opencode_ids"])})
    if sources["huggingface"] == "api" and data["hf_ids"]:
        save_to_cache(db, "huggingface", {"models": list(data["hf_ids"])})
