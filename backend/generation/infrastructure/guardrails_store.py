"""Persistencia de guardrails de entrada en PlatformConfig (mismo patrón que nodes_config).

Cada clave del contrato admin es una fila key/value, no un JSON embebido:
  guardrail_topic_area, guardrail_topic_enabled,
  guardrail_moderation_enabled, guardrail_moderation_terms,
  guardrail_moderation_model
"""

from __future__ import annotations

import time
from threading import RLock

import structlog

from generation.domain.guardrails import (
    GUARDRAIL_KEYS,
    effective_terms,
)

logger = structlog.get_logger(__name__)

_TTL_S = 30.0
_cache: dict[str, str] | None = None
_cache_at = 0.0
_lock = RLock()

_EMPTY_STORED = {
    "guardrail_topic_area": "",
    "guardrail_topic_enabled": "0",
    "guardrail_moderation_enabled": "0",
    "guardrail_moderation_terms": "",
    "guardrail_moderation_model": "",
}


def load_stored() -> dict[str, str]:
    """Lee las 5 claves desde PlatformConfig. Devuelve defaults en memoria si falla."""
    from core.database import SessionLocal
    from models import PlatformConfig

    db = SessionLocal()
    try:
        out = dict(_EMPTY_STORED)
        for key in GUARDRAIL_KEYS:
            row = db.get(PlatformConfig, key)
            if row and row.value is not None:
                out[key] = row.value
        return out
    except Exception:
        logger.exception("load config failed", key="guardrails")
        return dict(_EMPTY_STORED)
    finally:
        db.close()


def stored_cached() -> dict[str, str]:
    global _cache, _cache_at
    with _lock:
        if _cache is not None and (time.monotonic() - _cache_at) < _TTL_S:
            return dict(_cache)
    data = load_stored()
    with _lock:
        _cache = data
        _cache_at = time.monotonic()
    return dict(data)


def invalidate() -> None:
    global _cache, _cache_at
    with _lock:
        _cache = None
        _cache_at = 0.0


def get_guardrails_config() -> dict[str, str]:
    """Config efectiva para GET admin. Términos vacíos → lista por defecto (el suelo)."""
    stored = stored_cached()
    terms = "\n".join(effective_terms(stored.get("guardrail_moderation_terms", "")))
    return {
        "guardrail_topic_area": stored.get("guardrail_topic_area", ""),
        "guardrail_topic_enabled": stored.get("guardrail_topic_enabled", "0") or "0",
        "guardrail_moderation_enabled": stored.get("guardrail_moderation_enabled", "0") or "0",
        "guardrail_moderation_terms": terms,
        "guardrail_moderation_model": stored.get("guardrail_moderation_model", ""),
    }


def save_guardrails_config(payload: dict[str, str], db) -> dict[str, str]:
    """Persiste las claves recibidas (merge con lo ya guardado) e invalida la caché."""
    from models import PlatformConfig

    existing = stored_cached()
    merged = {**existing, **payload}
    try:
        for key in GUARDRAIL_KEYS:
            val = merged.get(key, _EMPTY_STORED[key])
            row = db.get(PlatformConfig, key)
            if row:
                row.value = val
            else:
                db.add(PlatformConfig(key=key, value=val))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("save_guardrails_config failed")
        raise
    finally:
        invalidate()
    return get_guardrails_config()


def runtime_settings() -> dict:
    """Vista para el chequeo en creación de job (flags como bool, términos efectivos)."""
    stored = stored_cached()
    return {
        "topic_enabled": stored.get("guardrail_topic_enabled", "0") == "1",
        "topic_area": (stored.get("guardrail_topic_area") or "").strip(),
        "moderation_enabled": stored.get("guardrail_moderation_enabled", "0") == "1",
        "terms": effective_terms(stored.get("guardrail_moderation_terms", "")),
        "moderation_model": (stored.get("guardrail_moderation_model") or "").strip(),
    }


# Re-export so tests can pin the store without importing domain twice.
__all__ = [
    "get_guardrails_config",
    "invalidate",
    "load_stored",
    "runtime_settings",
    "save_guardrails_config",
    "stored_cached",
]
