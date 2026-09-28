"""Fetch model metadata from OpenRouter and Groq APIs, merge with the curated
allowlist (model_catalog.CATALOG_ENTRIES), cache in Supabase and keep a fast
in-memory copy for request-time reads.

lifespan calls `refresh_catalog` at startup; endpoint users also hit the cache
via `get_catalog_entries()`.
"""

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from threading import Lock, RLock
from time import monotonic

import structlog

from llm.catalog.catalog_builder import _build_full_catalog
from llm.catalog.catalog_gather import (
    _dedupe_and_sort,
    _gather_provider_data,
    _persist_api_cache,
)
from llm.catalog.catalog_media import (
    build_media_entries,
    fetch_openrouter_media,
    load_cached_media,
    media_rows_of,
    merge_media_entries,
    save_media_cache,
)
from llm.catalog.catalog_refresh_providers import (
    _merge_groq,
    _merge_huggingface,
    _merge_opencode,
    _merge_openrouter,
)
from llm.catalog.model_catalog import CATALOG_ENTRIES, _rebuild_catalog

logger = structlog.get_logger(__name__)

# In-memory cache. Thread-safe: written only by refresh thread, guarded by _CL.
_catalog: list[dict] = list(CATALOG_ENTRIES)
_full_catalog: list[dict] = []  # populated on first refresh_catalog call
_CL = RLock()

# Per-provider health. source: api | cache | stale. `configured` is False when
# the platform has no key for the provider (not connected, not a failure) and
# None until the first refresh has checked it.
_provider_status: dict[str, dict] = {
    provider: {
        "ok": False,
        "configured": None,
        "checked_at": None,
        "last_success_at": None,
        "source": None,
    }
    for provider in ("openrouter", "groq", "opencode", "huggingface")
}

# Non-blocking guard against double-refresh on concurrent startup/retry.
_refresh_lock = Lock()
_last_full_success: float | None = None
_FRESH_WINDOW_S = 60.0

_CATALOG_REFRESH_TIMEOUT = float(os.getenv("CATALOG_REFRESH_TIMEOUT_S", "15"))


def get_catalog_entries() -> list[dict]:
    """Return the current merged catalog (fast path — in-memory)."""
    with _CL:
        return list(_catalog)


def get_full_catalog_entries() -> list[dict]:
    """Return ALL models from both providers with categories and pricing."""
    with _CL:
        return list(_full_catalog)


def get_provider_status() -> dict[str, dict]:
    """Snapshot of per-provider refresh health (for the settings UI)."""
    with _CL:
        return {provider: dict(st) for provider, st in _provider_status.items()}


def refresh_catalog(db=None, *, force: bool = False) -> None:
    """Fetch provider APIs in parallel, merge into CATALOG_ENTRIES, rebuild CATALOG,
    optionally persist to cache, and update the in-memory copy.

    Resilient by design: when a provider fetch fails we fall back to the DB
    cache, and when that also fails we keep the last in-memory state for that
    provider (never mass-deactivate its models) and flag it in
    `_provider_status` so the UI can warn the user and offer a retry.

    `db` is an optional SQLAlchemy Session — if provided, we read/write Supabase
    cache. Called from lifespan with a fresh session, from the admin endpoint,
    or from the user-facing retry endpoint.

    `force` skips the "refreshed recently" shortcut: after a platform key
    changes, the provider it connects must be fetched right away.
    """
    global _catalog, _full_catalog, _last_full_success

    if not _refresh_lock.acquire(blocking=False):
        logger.info("catalog refresh already in progress — skipping")
        return
    try:
        with _CL:
            fresh = (
                _last_full_success is not None
                and monotonic() - _last_full_success < _FRESH_WINDOW_S
            )
        if fresh and not force:
            logger.info("catalog refreshed recently — skipping", fresh_window_s=_FRESH_WINDOW_S)
            return

        # Fetch all providers in parallel (None = failed), falling back to the
        # Supabase cache for any that failed. The OpenRouter image/video lists
        # travel in their own thread: they are public and slower (one price
        # request per image model).
        with ThreadPoolExecutor(max_workers=1) as media_pool:
            media_future = media_pool.submit(_fetch_media)
            data, sources, configured = _gather_provider_data(db, _CATALOG_REFRESH_TIMEOUT)
            media_raw, media_source = _media_result(media_future, db)
        or_data, groq_ids = data["or_data"], data["groq_ids"]
        opencode_ids, hf_ids = data["opencode_ids"], data["hf_ids"]
        or_source, groq_source = sources["openrouter"], sources["groq"]
        oc_source, hf_source = sources["opencode"], sources["huggingface"]

        # Merge only providers with usable data — failed provider keeps previous active flags.
        if or_data is not None:
            _merge_openrouter(or_data)
        if groq_ids is not None:
            _merge_groq(groq_ids)
        if opencode_ids is not None:
            _merge_opencode(opencode_ids)
        if hf_ids is not None:
            _merge_huggingface(hf_ids)
        _rebuild_catalog()

        full = _build_full_catalog(or_data or {}, groq_ids or set(), opencode_ids, hf_ids)
        now = datetime.now(UTC).isoformat()

        with _CL:
            _catalog = list(CATALOG_ENTRIES)
            # Carry over the previous slice of any provider that failed so the
            # full-catalog browser doesn't lose it.
            if or_data is None:
                full.extend(e for e in _full_catalog if e["provider"] == "openrouter")
            if groq_ids is None:
                full.extend(e for e in _full_catalog if e["provider"] == "groq")
            if opencode_ids is None:
                full.extend(e for e in _full_catalog if e["provider"] == "opencode")
            if hf_ids is None:
                full.extend(e for e in _full_catalog if e["provider"] == "huggingface")
            full = _with_media(full, _full_catalog, media_raw)
            full = _dedupe_and_sort(full)
            _full_catalog = full
            for provider, source in (
                ("openrouter", or_source),
                ("groq", groq_source),
                ("opencode", oc_source),
                ("huggingface", hf_source),
            ):
                st = _provider_status[provider]
                st["checked_at"] = now
                st["ok"] = source is not None
                st["configured"] = configured[provider]
                st["source"] = source or "stale"
                if source is not None:
                    st["last_success_at"] = now
            # Fresh when every connected provider answered: a provider without
            # a key never will, and must not force a refetch on every retry.
            if all(sources[p] == "api" for p, has_key in configured.items() if has_key):
                _last_full_success = monotonic()
        logger.info(
            "in-memory catalog updated",
            curated_count=len(_catalog),
            total_count=len(full),
        )

        # Persist raw API data to Supabase cache (never re-save cache reads).
        if db is not None and "api" in sources.values():
            try:
                _persist_api_cache(db, sources, data)
            except Exception:
                logger.exception("failed to save catalog cache to DB")
        if db is not None and media_source == "api":
            try:
                save_media_cache(db, media_raw)
            except Exception:
                logger.exception("failed to save media catalog cache to DB")
    finally:
        _refresh_lock.release()


def _fetch_media() -> dict | None:
    """Listados de imagen/video de OpenRouter (None si fallan). Nunca lanza."""
    try:
        return fetch_openrouter_media()
    except Exception:
        logger.exception("media model list fetch crashed", provider="openrouter")
        return None


def _media_result(future, db) -> tuple[dict | None, str | None]:
    """(listados crudos, origen «api»|«cache»|None) con la caché como respaldo."""
    try:
        raw = future.result(timeout=_CATALOG_REFRESH_TIMEOUT + 15)
    except Exception:
        logger.exception("media model list fetch timed out", provider="openrouter")
        raw = None
    if raw is not None:
        return raw, "api"
    cached = load_cached_media(db)
    return (cached, "cache") if cached is not None else (None, None)


def _with_media(full: list[dict], previous: list[dict], media_raw: dict | None) -> list[dict]:
    """Suma los modelos de imagen y video; el tipo cuyo listado falló conserva
    las filas del refresco anterior en vez de desaparecer del selector."""
    built = build_media_entries(media_raw)
    rows: list[dict] = []
    for kind in ("image", "video"):
        fresh = built.get(kind)
        rows.extend(fresh if fresh is not None else media_rows_of(previous, kind))
    return merge_media_entries(full, rows)
