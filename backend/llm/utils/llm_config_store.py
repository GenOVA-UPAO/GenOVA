"""Config admin de modelos LLM por tarea + cadena de fallback.

El router (``llm/router.py``) lee de aquí el modelo primario y la cadena de
fallback por tarea, en vez de constantes hardcodeadas, para que un admin pueda
cambiarlos desde la UI sin redeploy. Se respalda en la tabla key/value
``PlatformConfig`` (clave ``llm_model_config``) y cae a las semillas del router
cuando no hay config o una entrada es inválida.

Cache en proceso con TTL corto: cada worker reconcilia el cambio del admin a los
``_TTL_S`` segundos (suficiente sin invalidación cross-proceso en multi-worker).
"""

import json
import logging
import time
from threading import RLock

from core.database import SessionLocal
from llm.catalog.catalog_refresh import get_full_catalog_entries
from llm.catalog.model_catalog import TASKS, is_valid_model
from models import PlatformConfig

logger = logging.getLogger(__name__)

PROVIDERS = ("groq", "openrouter", "opencode")
PLATFORM_KEY = "llm_model_config"
_TTL_S = 30.0

_cache: dict | None = None
_cache_at = 0.0
_lock = RLock()


def _full_keys() -> set[tuple[str, str]]:
    return {(e["provider"], e["model_id"]) for e in get_full_catalog_entries()}


def _valid(provider, model_id, full_keys) -> bool:
    if provider not in PROVIDERS or not model_id:
        return False
    return is_valid_model(provider, model_id) or (provider, model_id) in full_keys


def _clean_entry(raw, full_keys) -> dict | None:
    """Normaliza una entrada {provider, model_id, extra?, timeout_s?} o None."""
    if not isinstance(raw, dict):
        return None
    provider, model_id = raw.get("provider"), raw.get("model_id")
    if not _valid(provider, model_id, full_keys):
        return None
    entry = {"provider": provider, "model_id": model_id}
    extra = raw.get("extra")
    entry["extra"] = extra if isinstance(extra, dict) else {}
    if raw.get("timeout_s") is not None:
        entry["timeout_s"] = raw["timeout_s"]
    return entry


def sanitize_config(payload: dict | None) -> dict:
    """Valida un payload admin {defaults:{tarea:entry}, fallbacks:{tarea:[entry]}}.

    Descarta entradas inválidas en silencio (nunca lanza) — la config jamás debe
    romper la generación. Devuelve la config limpia y lista para persistir.
    """
    payload = payload or {}
    fk = _full_keys()
    raw_defaults = payload.get("defaults") or {}
    raw_fallbacks = payload.get("fallbacks") or {}

    defaults: dict[str, dict] = {}
    fallbacks: dict[str, list] = {}
    for tarea in TASKS:
        d = _clean_entry(raw_defaults.get(tarea), fk)
        if d:
            defaults[tarea] = d
        lst = raw_fallbacks.get(tarea) or []
        clean = [c for c in (_clean_entry(x, fk) for x in lst) if c]
        if clean:
            fallbacks[tarea] = clean
    return {"defaults": defaults, "fallbacks": fallbacks}


def load_stored() -> dict:
    """Lee la config cruda de PlatformConfig (sin merge). {} si no existe."""
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


def save_stored(clean: dict) -> None:
    """Persiste la config (ya saneada) e invalida el cache."""
    db = SessionLocal()
    try:
        val = json.dumps(clean, ensure_ascii=False)
        row = db.get(PlatformConfig, PLATFORM_KEY)
        if row:
            row.value = val
        else:
            db.add(PlatformConfig(key=PLATFORM_KEY, value=val))
        db.commit()
    finally:
        db.close()
    invalidate()


def invalidate() -> None:
    global _cache, _cache_at
    with _lock:
        _cache = None
        _cache_at = 0.0


def stored_cached() -> dict:
    """Config almacenada con cache TTL (lo que el router consulta por llamada)."""
    global _cache, _cache_at
    with _lock:
        if _cache is not None and (time.monotonic() - _cache_at) < _TTL_S:
            return _cache
    data = load_stored()
    with _lock:
        _cache = data
        _cache_at = time.monotonic()
    return data
