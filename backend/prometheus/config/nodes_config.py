"""Configuración de nodos/agentes Prometheus + store con TTL 30s (EN-017)."""

import json
import logging
import time
from threading import RLock

logger = logging.getLogger(__name__)

PLATFORM_KEY = "ova_nodes_config"
_TTL_S = 30.0
_cache: dict | None = None
_cache_at = 0.0
_lock = RLock()

_D = "Generador 5E"
NODES = [
    {
        "id": "concierge",
        "name": "Concierge",
        "role": "Planificador",
        "always_on": True,
        "description": "Descompone el prompt en plan de recursos 5E (Planner)",
    },
    {
        "id": "engage",
        "name": "Engage",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de enganche — Fase 1 del modelo 5E",
    },
    {
        "id": "explore",
        "name": "Explore",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de exploración — Fase 2",
    },
    {
        "id": "explain",
        "name": "Explain",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de explicación formal — Fase 3",
    },
    {
        "id": "elaborate",
        "name": "Elaborate",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de elaboración — Fase 4",
    },
    {
        "id": "evaluate",
        "name": "Evaluate",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de evaluación — Fase 5",
    },
    {
        "id": "critic",
        "name": "Crítico pedagógico",
        "role": "Evaluador",
        "always_on": False,
        "configurable": True,
        "flag": "ova_critic",
        "default": "0",
        "description": "Evalúa calidad pedagógica; re-genera con feedback si score bajo.",
        "param": {
            "key": "ova_reflection_rounds",
            "label": "Rondas máx",
            "type": "int",
            "min": 0,
            "max": 3,
            "default": 1,
        },
    },
    {
        "id": "editor",
        "name": "Editor de Coherencia 5E",
        "role": "Editor",
        "always_on": False,
        "configurable": True,
        "flag": "ova_editor",
        "default": "0",
        "description": "Revisa terminología y progresión 5E antes de ensamblar.",
    },
    {
        "id": "assemble",
        "name": "Assembler",
        "role": "Ensamblador",
        "always_on": True,
        "description": "Ensambla resultados y genera el paquete SCORM.",
    },
]

CAPABILITIES = [
    {
        "id": "images",
        "name": "Generador de imágenes",
        "role": "Medios",
        "always_on": True,
        "description": "Genera imágenes AI para recursos engage y las embebe como data URIs en el SCORM.",
    },
    {
        "id": "video",
        "name": "Generador de Video",
        "role": "Medios",
        "always_on": True,
        "status_key": "video_api_key",
        "description": "Recursos de video 5E. Sin API key → genera prompt copiable para el estudiante.",
    },
    {
        "id": "refine",
        "name": "Refinador estructural",
        "role": "Corrector",
        "always_on": False,
        "configurable": True,
        "flag": "ova_refine",
        "default": "1",
        "description": "Detecta y corrige defectos HTML/JS. Corre en paralelo por recurso.",
    },
]

VIDEO_RESOURCE_TYPES: dict[str, list[int]] = {
    "engage": [2],
    "explore": [4],
    "explain": [1],
}


def is_video_resource(phase: str, rt) -> bool:
    """Return True when resource_type rt belongs to the video node for phase."""
    return int(rt) in VIDEO_RESOURCE_TYPES.get(phase, [])


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
