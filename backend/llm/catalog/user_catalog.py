"""Catálogo de modelos por usuario, pedido con su propia clave.

Regla de producto: sin clave propia el usuario genera con los modelos del
administrador. Con clave propia de un proveedor puede elegir entre los modelos
de ESE proveedor, aunque la plataforma no tenga clave para él, y se pagan con la
suya. Por eso la lista de ese proveedor se pide con la clave del usuario.

Aislamiento: la caché es de este módulo, en memoria y por (usuario, proveedor);
nunca escribe en la caché ni en el catálogo de plataforma, y las listas de un
usuario no se ven desde otro. Cada entrada guarda la huella (sha256 recortado)
de la clave con la que se pidió: si el usuario cambia de clave, la entrada deja
de valer sola, también en otros workers. Al guardar o quitar la clave se invalida
además de forma explícita (`invalidate_user_catalog`).

La clave no se registra ni se devuelve: solo viaja al proveedor.
"""

from __future__ import annotations

import hashlib
import os
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock, RLock
from time import monotonic

from llm.catalog.catalog_builder import _build_full_catalog
from llm.catalog.catalog_gather import _dedupe_and_sort
from llm.catalog.model_catalog import CATALOG_ENTRIES
from llm.catalog.provider_listing import (
    INVALID_KEY,
    LISTABLE_PROVIDERS,
    UNREACHABLE,
    classify_error,
    list_models_with_key,
    log_listing_failure,
)

# Una lista de modelos cambia poco: 6 h evita pedirla en cada carga de /models.
USER_CATALOG_TTL_S = float(os.getenv("USER_CATALOG_TTL_S", str(6 * 3600)))
# Un fallo pasajero se reintenta pronto; una clave rechazada no mejora sola.
_TRANSIENT_ERROR_TTL_S = 120.0
_INVALID_KEY_TTL_S = 900.0
_MAX_ENTRIES = 5000
_FETCH_TIMEOUT_S = 15.0

# OpenRouter publica su lista sin clave: la trae el refresco de plataforma y con
# la del usuario solo se comprueba que sea válida.
_PUBLIC_LIST_PROVIDERS = frozenset({"openrouter"})
_DATA_ARG = {"groq": "groq_ids", "opencode": "opencode_ids", "huggingface": "hf_ids"}


@dataclass(frozen=True)
class ProviderListing:
    """Resultado de pedir la lista de un proveedor con la clave del usuario."""

    state: str  # "connected" | "error"
    ids: frozenset[str] | None  # None: lista pública de plataforma o sin datos
    error: str | None
    checked_at: str


@dataclass(frozen=True)
class _CacheEntry:
    fingerprint: str
    expires_at: float
    listing: ProviderListing


_cache: OrderedDict[tuple[str, str], _CacheEntry] = OrderedDict()
_cache_lock = RLock()
_fetch_locks: dict[tuple[str, str], Lock] = {}


def _fingerprint(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()[:16]


def _ttl(listing: ProviderListing) -> float:
    if listing.state == "connected":
        return USER_CATALOG_TTL_S
    return _INVALID_KEY_TTL_S if listing.error == INVALID_KEY else _TRANSIENT_ERROR_TTL_S


def _lookup(slot: tuple[str, str], fingerprint: str, *, fresh: bool) -> ProviderListing | None:
    with _cache_lock:
        entry = _cache.get(slot)
        if entry is None or entry.fingerprint != fingerprint:
            return None
        if fresh and entry.expires_at <= monotonic():
            return None
        _cache.move_to_end(slot)
        return entry.listing


def _store(slot: tuple[str, str], fingerprint: str, listing: ProviderListing) -> None:
    with _cache_lock:
        _cache[slot] = _CacheEntry(fingerprint, monotonic() + _ttl(listing), listing)
        _cache.move_to_end(slot)
        while len(_cache) > _MAX_ENTRIES:
            old, _ = _cache.popitem(last=False)
            _fetch_locks.pop(old, None)


def _fetch_lock(slot: tuple[str, str]) -> Lock:
    with _cache_lock:
        return _fetch_locks.setdefault(slot, Lock())


def invalidate_user_catalog(user_id, providers=None) -> None:
    """Olvida las listas del usuario (todas, o solo las de `providers`)."""
    uid = str(user_id)
    with _cache_lock:
        for slot in [s for s in _cache if s[0] == uid]:
            if providers is None or slot[1] in providers:
                del _cache[slot]


def clear_user_catalog_cache() -> None:
    """Solo para tests."""
    with _cache_lock:
        _cache.clear()
        _fetch_locks.clear()


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _fetch_listing(
    user_id: str, provider: str, api_key: str, previous: ProviderListing | None
) -> ProviderListing:
    try:
        ids = list_models_with_key(provider, api_key)
    except Exception as exc:
        code = classify_error(exc)
        log_listing_failure(provider, exc, user_id=user_id, scope="user")
        # Ante un fallo pasajero se conserva la última lista buena de esa misma
        # clave; con la clave rechazada no hay nada que ofrecer.
        stale = previous.ids if previous is not None and code != INVALID_KEY else None
        return ProviderListing("error", stale, code, _now_iso())
    return ProviderListing(
        "connected", frozenset(ids) if ids is not None else None, None, _now_iso()
    )


def get_provider_listing(
    user_id, provider: str, api_key: str, *, force: bool = False
) -> ProviderListing:
    """Lista de `provider` con la clave del usuario, de caché si está vigente."""
    slot = (str(user_id), provider)
    fingerprint = _fingerprint(api_key)
    if not force and (hit := _lookup(slot, fingerprint, fresh=True)) is not None:
        return hit
    # Una petición a la vez por usuario y proveedor: las páginas del catálogo
    # llegan en paralelo y no deben pedir la misma lista varias veces.
    with _fetch_lock(slot):
        if not force and (hit := _lookup(slot, fingerprint, fresh=True)) is not None:
            return hit
        previous = _lookup(slot, fingerprint, fresh=False)
        listing = _fetch_listing(str(user_id), provider, api_key, previous)
        _store(slot, fingerprint, listing)
        return listing


def own_listable_keys(user_api_keys: dict | None) -> dict[str, str]:
    """Claves propias no vacías de los proveedores de texto con lista de modelos."""
    return {
        provider: key.strip()
        for provider, key in (user_api_keys or {}).items()
        if provider in LISTABLE_PROVIDERS and isinstance(key, str) and key.strip()
    }


def load_user_catalog(user_id, user_api_keys: dict | None, *, force: bool = False) -> UserCatalog:
    """Listas de todos los proveedores con clave propia; las que no están en
    caché se piden en paralelo."""
    keys = own_listable_keys(user_api_keys)
    listings: dict[str, ProviderListing] = {}
    missing: dict[str, str] = {}
    for provider, key in keys.items():
        hit = None if force else _lookup((str(user_id), provider), _fingerprint(key), fresh=True)
        if hit is None:
            missing[provider] = key
        else:
            listings[provider] = hit
    if missing:
        listings.update(_fetch_many(user_id, missing, force=force))
    return UserCatalog(listings)


def _fetch_many(user_id, keys: dict[str, str], *, force: bool) -> dict[str, ProviderListing]:
    pool = ThreadPoolExecutor(max_workers=len(keys))
    try:
        futures = {
            provider: pool.submit(get_provider_listing, user_id, provider, key, force=force)
            for provider, key in keys.items()
        }
        out: dict[str, ProviderListing] = {}
        for provider, future in futures.items():
            try:
                out[provider] = future.result(timeout=_FETCH_TIMEOUT_S)
            except FutureTimeoutError:
                out[provider] = ProviderListing("error", None, UNREACHABLE, _now_iso())
        return out
    finally:
        pool.shutdown(wait=False, cancel_futures=True)


def _provider_entries(provider: str, ids) -> list[dict]:
    if provider not in _DATA_ARG:
        # OpenRouter con la clave rechazada: no hay modelos que ofrecer.
        return []
    args = {"or_data": {}, "groq_ids": set(), "opencode_ids": set(), "hf_ids": set()}
    args[_DATA_ARG[provider]] = set(ids or ())
    # Las APIs de Groq/OpenCode/HF solo dan el id: los curados traen su nombre.
    labels = {
        e["model_id"]: e["label"]
        for e in CATALOG_ENTRIES
        if e["provider"] == provider and e.get("label")
    }
    return [
        {**e, "label": labels.get(e["model_id"], e["label"])}
        for e in _build_full_catalog(**args)
    ]


@dataclass(frozen=True)
class UserCatalog:
    """Vista del catálogo para un usuario: sus listas sustituyen a las de la
    plataforma en los proveedores donde tiene clave propia."""

    listings: dict[str, ProviderListing]

    @property
    def providers(self) -> set[str]:
        return set(self.listings)

    def _uses_platform_list(self, provider: str) -> bool:
        listing = self.listings[provider]
        return provider in _PUBLIC_LIST_PROVIDERS and listing.error != INVALID_KEY

    def _replaced(self) -> set[str]:
        return {p for p in self.listings if not self._uses_platform_list(p)}

    def merge_full(self, platform_full: list[dict]) -> list[dict]:
        """Catálogo completo para el usuario (copia; no toca el de plataforma)."""
        if not self.listings:
            return platform_full
        replaced = self._replaced()
        merged = [e for e in platform_full if e["provider"] not in replaced]
        for provider in replaced:
            merged.extend(_provider_entries(provider, self.listings[provider].ids))
        return _dedupe_and_sort(merged)

    def adjust_curated(self, curated: list[dict]) -> list[dict]:
        """Curados con `active` según la lista del usuario en sus proveedores."""
        replaced = self._replaced()
        out = []
        for entry in curated:
            if entry["provider"] in replaced:
                ids = self.listings[entry["provider"]].ids or frozenset()
                entry = {**entry, "active": entry["model_id"] in ids}
            out.append(entry)
        return out

    def model_keys(self, merged_full: list[dict]) -> set[tuple[str, str]]:
        """(proveedor, modelo) que el usuario puede elegir con sus claves."""
        return {
            (e["provider"], e["model_id"])
            for e in merged_full
            if e["provider"] in self.listings and e.get("active", True)
        }

    def unverified_providers(self) -> set[str]:
        """Proveedores cuya lista no se pudo comprobar por un fallo pasajero y
        sin lista anterior: lo que el usuario ya tenía guardado se respeta."""
        return {
            p
            for p, listing in self.listings.items()
            if listing.state == "error"
            and listing.error != INVALID_KEY
            and listing.ids is None
            and not self._uses_platform_list(p)
        }

    def status(self, merged_full: list[dict]) -> dict[str, dict]:
        """Estado por proveedor de texto: sin conectar, conectado o error."""
        counts: dict[str, int] = {}
        for e in merged_full:
            if e["provider"] in self.listings:
                counts[e["provider"]] = counts.get(e["provider"], 0) + 1
        out: dict[str, dict] = {}
        for provider in LISTABLE_PROVIDERS:
            listing = self.listings.get(provider)
            if listing is None:
                out[provider] = {"state": "not_connected", "error": None, "checked_at": None, "models": None}
                continue
            out[provider] = {
                "state": listing.state,
                "error": listing.error,
                "checked_at": listing.checked_at,
                "models": counts.get(provider, 0),
            }
        return out
