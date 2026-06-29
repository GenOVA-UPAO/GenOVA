"""Configuración de nodos/agentes Prometheus + store con TTL 30s (EN-017)."""

import json
import logging
import time
from threading import RLock

# Re-exported so existing `from prometheus.config.nodes_config import NODES, ...`
# call sites keep working after the static catalog moved to nodes_catalog.
from prometheus.config.nodes_catalog import (  # noqa: F401
    CAPABILITIES,
    NODES,
    VIDEO_RESOURCE_TYPES,
    is_video_resource,
)

logger = logging.getLogger(__name__)

PLATFORM_KEY = "ova_nodes_config"
_TTL_S = 30.0
_cache: dict | None = None
_cache_at = 0.0
_lock = RLock()


# ── Persistence helpers (monkeypatchable in tests) ────────────────────────────


def load_stored() -> dict:
    """Read raw stored dict from PlatformConfig. Returns {} on error."""
    from core.database import SessionLocal
    from models import PlatformConfig

    db = SessionLocal()
    try:
        row = db.get(PlatformConfig, PLATFORM_KEY)
        if not row or not row.value:
            return {}
        data = json.loads(row.value)
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.exception("load %s failed", PLATFORM_KEY)
        return {}
    finally:
        db.close()


def stored_cached() -> dict:
    """Cached DB load with TTL."""
    global _cache, _cache_at
    with _lock:
        if _cache is not None and (time.monotonic() - _cache_at) < _TTL_S:
            return _cache
    data = load_stored()
    with _lock:
        _cache = data
        _cache_at = time.monotonic()
    return data


def invalidate() -> None:
    global _cache, _cache_at
    with _lock:
        _cache = None
        _cache_at = 0.0


def get_nodes_config() -> dict:
    """Return merged config: DB overrides take precedence over settings.*.

    Merge done fresh each call so settings monkeypatches in tests work.
    Only the DB load is cached with TTL (mirrors effective_llm_config pattern).
    """
    from core.config import settings

    db_data = stored_cached()
    return {
        "ova_refine": db_data.get("ova_refine", settings.ova_refine),
        "ova_critic": db_data.get("ova_critic", settings.ova_critic),
        "ova_reflection_rounds": db_data.get(
            "ova_reflection_rounds", settings.ova_reflection_rounds
        ),
        "ova_editor": db_data.get("ova_editor", settings.ova_editor),
    }


def save_nodes_config(payload: dict, db) -> dict:
    """Persist validated payload to PlatformConfig and invalidate cache."""
    from models import PlatformConfig

    existing = stored_cached()
    merged = {**existing, **payload}
    val = json.dumps(merged, ensure_ascii=False)
    try:
        row = db.get(PlatformConfig, PLATFORM_KEY)
        if row:
            row.value = val
        else:
            db.add(PlatformConfig(key=PLATFORM_KEY, value=val))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("save_nodes_config failed")
        raise
    finally:
        invalidate()
    return get_nodes_config()
