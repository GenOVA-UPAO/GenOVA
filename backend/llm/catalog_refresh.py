"""Fetch model metadata from OpenRouter and Groq APIs, merge with the curated
allowlist (model_catalog.CATALOG_ENTRIES), cache in Supabase and keep a fast
in-memory copy for request-time reads.

lifespan calls `refresh_catalog` at startup; endpoint users also hit the cache
via `get_catalog_entries()`.
"""

import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from threading import Lock, RLock
from time import monotonic

from llm.catalog_refresh_providers import (
    _build_full_catalog,
    _fetch_groq,
    _fetch_openrouter,
    _load_cached,
    _merge_groq,
    _merge_openrouter,
)
from llm.model_catalog import CATALOG_ENTRIES, _rebuild_catalog

logger = logging.getLogger(__name__)

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

# Per-provider refresh health, exposed to the UI so a failed fetch is visible
# instead of silently emptying the model dropdowns. source: api | cache | stale.
_provider_status: dict[str, dict] = {
    "openrouter": {"ok": False, "checked_at": None, "last_success_at": None, "source": None},
    "groq": {"ok": False, "checked_at": None, "last_success_at": None, "source": None},
    "opencode": {"ok": True, "checked_at": None, "last_success_at": None, "source": "static"},
}

# Non-blocking guard: startup refresh and the user-facing retry endpoint may
# race; the loser returns immediately instead of double-fetching.
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


def refresh_catalog(db=None) -> None:
    """Fetch provider APIs in parallel, merge into CATALOG_ENTRIES, rebuild CATALOG,
    optionally persist to cache, and update the in-memory copy.

    Resilient by design: when a provider fetch fails we fall back to the DB
    cache, and when that also fails we keep the last in-memory state for that
    provider (never mass-deactivate its models) and flag it in
    `_provider_status` so the UI can warn the user and offer a retry.

    `db` is an optional SQLAlchemy Session — if provided, we read/write Supabase
    cache. Called from lifespan with a fresh session, from the admin endpoint,
    or from the user-facing retry endpoint.
    """
    global _catalog, _full_catalog, _last_full_success

    if not _refresh_lock.acquire(blocking=False):
        logger.info("Catalog refresh already in progress — skipping")
        return
    try:
        with _CL:
            fresh = (
                _last_full_success is not None
                and monotonic() - _last_full_success < _FRESH_WINDOW_S
            )
        if fresh:
            logger.info("Catalog refreshed <%.0fs ago — skipping", _FRESH_WINDOW_S)
            return

        # Fetch both providers in parallel. None = fetch failed (vs empty data).
        or_data: dict | None = None
        groq_ids: set | None = None
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_or = pool.submit(_fetch_openrouter)
            f_groq = pool.submit(_fetch_groq)
            try:
                for future in as_completed(
                    [f_or, f_groq], timeout=_CATALOG_REFRESH_TIMEOUT + 5
                ):
                    if future is f_or:
                        or_data = future.result()
                    elif future is f_groq:
                        groq_ids = future.result()
            except TimeoutError:
                logger.exception("Catalog provider fetch timed out")

        or_source = "api" if or_data is not None else None
        groq_source = "api" if groq_ids is not None else None

        # Fall back to the Supabase cache for whichever provider failed.
        if or_data is None:
            cached = _load_cached(db, "openrouter")
            if cached is not None:
                or_data, or_source = cached, "cache"
        if groq_ids is None:
            cached = _load_cached(db, "groq")
            if cached is not None:
                groq_ids, groq_source = cached, "cache"

        # Merge only providers with usable data — a failed provider keeps its
        # previous active flags instead of being wiped from the catalog.
        if or_data is not None:
            _merge_openrouter(or_data)
        if groq_ids is not None:
            _merge_groq(groq_ids)
        _rebuild_catalog()

        full = _build_full_catalog(or_data or {}, groq_ids or set())
        now = datetime.now(UTC).isoformat()

        with _CL:
            _catalog = list(CATALOG_ENTRIES)
            # Carry over the previous slice of any provider that failed so the
            # full-catalog browser doesn't lose it.
            if or_data is None:
                full.extend(e for e in _full_catalog if e["provider"] == "openrouter")
            if groq_ids is None:
                full.extend(e for e in _full_catalog if e["provider"] == "groq")
            # Static providers are already included by _build_full_catalog —
            # no extend needed (would create duplicates like a double opencode entry).
            seen_keys: set[tuple[str, str]] = set()
            deduped: list[dict] = []
            for e in full:
                key = (e["provider"], e["model_id"])
                if key not in seen_keys:
                    seen_keys.add(key)
                    deduped.append(e)
            full = deduped
            full.sort(key=lambda e: (not e["curated"], e["provider"], e["model_id"]))
            _full_catalog = full
            for provider, source in (
                ("openrouter", or_source),
                ("groq", groq_source),
            ):
                st = _provider_status[provider]
                st["checked_at"] = now
                st["ok"] = source is not None
                st["source"] = source or "stale"
                if source is not None:
                    st["last_success_at"] = now
            if or_source == "api" and groq_source == "api":
                _last_full_success = monotonic()
        logger.info(
            "In-memory catalog updated (%d curated | %d total)",
            len(_catalog),
            len(full),
        )

        # Persist raw API data to Supabase cache (never re-save cache reads).
        if db is not None and (or_source == "api" or groq_source == "api"):
            try:
                from llm.catalog_cache import save_to_cache

                if or_source == "api" and or_data:
                    save_to_cache(db, "openrouter", {"models": or_data})
                if groq_source == "api" and groq_ids:
                    save_to_cache(db, "groq", {"models": list(groq_ids)})
            except Exception:
                logger.exception("Failed to save catalog cache to DB")
    finally:
        _refresh_lock.release()
