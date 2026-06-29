"""Refresh-orchestration helpers: parallel provider fetch with cache fallback,
plus dedupe/sort and cache-persist steps. Kept out of catalog_refresh so the
orchestrator stays a readable top-level flow.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from llm.catalog.catalog_refresh_providers import (
    _fetch_groq,
    _fetch_huggingface,
    _fetch_opencode,
    _fetch_openrouter,
    _load_cached,
)

logger = logging.getLogger(__name__)


def _gather_provider_data(db, timeout: float) -> tuple[dict, dict[str, str | None]]:
    """Fetch every provider in parallel; fall back to the DB cache for any that
    fail. Returns ({or_data, groq_ids, opencode_ids, hf_ids}, {provider: source}).
    `source` is "api" | "cache" | None (None = no usable data → keep previous)."""
    or_data: dict | None = None
    groq_ids: set | None = None
    opencode_ids: set | None = None
    hf_ids: set | None = None
    with ThreadPoolExecutor(max_workers=4) as pool:
        f_or = pool.submit(_fetch_openrouter)
        f_groq = pool.submit(_fetch_groq)
        f_oc = pool.submit(_fetch_opencode)
        f_hf = pool.submit(_fetch_huggingface)
        try:
            for future in as_completed([f_or, f_groq, f_oc, f_hf], timeout=timeout + 5):
                if future is f_or:
                    or_data = future.result()
                elif future is f_groq:
                    groq_ids = future.result()
                elif future is f_oc:
                    opencode_ids = future.result()
                elif future is f_hf:
                    hf_ids = future.result()
        except TimeoutError:
            logger.exception("Catalog provider fetch timed out")

    sources: dict[str, str | None] = {
        "openrouter": "api" if or_data is not None else None,
        "groq": "api" if groq_ids is not None else None,
        "opencode": "api" if opencode_ids is not None else None,
        "huggingface": "api" if hf_ids is not None else None,
    }
    if or_data is None:
        cached = _load_cached(db, "openrouter")
        if cached is not None:
            or_data, sources["openrouter"] = cached, "cache"
    if groq_ids is None:
        cached = _load_cached(db, "groq")
        if cached is not None:
            groq_ids, sources["groq"] = cached, "cache"
    if opencode_ids is None:
        cached = _load_cached(db, "opencode")
        if cached is not None:
            opencode_ids, sources["opencode"] = cached, "cache"
    if hf_ids is None:
        cached = _load_cached(db, "huggingface")
        if cached is not None:
            hf_ids, sources["huggingface"] = cached, "cache"

    data = {
        "or_data": or_data,
        "groq_ids": groq_ids,
        "opencode_ids": opencode_ids,
        "hf_ids": hf_ids,
    }
    return data, sources


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
        save_to_cache(db, "groq", {"models": list(data["groq_ids"])})
    if sources["opencode"] == "api" and data["opencode_ids"]:
        save_to_cache(db, "opencode", {"models": list(data["opencode_ids"])})
    if sources["huggingface"] == "api" and data["hf_ids"]:
        save_to_cache(db, "huggingface", {"models": list(data["hf_ids"])})
