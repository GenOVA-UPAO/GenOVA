"""Caché de imágenes generadas (disco): reutiliza al regenerar o repetir el mismo prompt.

Clave = sha256(prompt normalizado + estilo + modelo + tamaño). La semilla NO entra en la
clave: el mismo prompt con el mismo estilo es «la misma imagen» aunque venga de otro OVA.
Guarda el data URI tal cual (los HTML del OVA son autocontenidos). Escritura atómica; un
fallo de disco nunca rompe la generación (se trata como fallo de caché).
Métricas: contador Prometheus `genova_image_cache_total{result}` + `stats()`.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import threading
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

_lock = threading.Lock()
_counts = {"hit": 0, "miss": 0, "store": 0}

try:  # prometheus_client llega con el instrumentador de /metrics; opcional
    from prometheus_client import Counter

    _COUNTER = Counter("genova_image_cache_total", "Caché de imágenes generadas", ["result"])
except Exception:  # noqa: BLE001 — sin cliente de métricas o registro duplicado en recargas
    _COUNTER = None


def _count(result: str) -> None:
    with _lock:
        _counts[result] += 1
    if _COUNTER is not None:
        _COUNTER.labels(result=result).inc()


def cache_dir() -> Path:
    raw = os.getenv("IMAGE_CACHE_DIR", "").strip()
    return Path(raw) if raw else Path(tempfile.gettempdir()) / "genova-image-cache"


def enabled() -> bool:
    return os.getenv("IMAGE_CACHE", "1").strip().lower() not in ("0", "false", "off", "no")


def normalize_prompt(prompt: str) -> str:
    return re.sub(r"\s+", " ", (prompt or "").strip().lower())


def cache_key(prompt: str, style: str, model: str, width: int, height: int) -> str:
    raw = "\x1f".join(
        (normalize_prompt(prompt), normalize_prompt(style), model or "", f"{width}x{height}")
    )
    return hashlib.sha256(raw.encode()).hexdigest()


def _path(key: str) -> Path:
    return cache_dir() / key[:2] / f"{key}.uri"


def _meta_path(key: str) -> Path:
    return cache_dir() / key[:2] / f"{key}.meta.json"


def get(key: str) -> str | None:
    if not enabled():
        return None
    try:
        uri = _path(key).read_text(encoding="utf-8")
    except OSError:
        uri = ""
    if uri.startswith("data:"):
        _count("hit")
        return uri
    _count("miss")
    return None


def get_record(key: str) -> dict[str, Any] | None:
    """Recupera la imagen y sus metadatos reales de licencia y atribución."""
    if not enabled():
        return None
    try:
        uri = _path(key).read_text(encoding="utf-8")
        if not uri.startswith("data:"):
            _count("miss")
            return None
        meta_text = _meta_path(key).read_text(encoding="utf-8")
        meta = json.loads(meta_text)
        _count("hit")
        return {"data_uri": uri, "meta": meta}
    except Exception:
        _count("miss")
        return None


def put(key: str, data_uri: str, meta: dict[str, Any] | None = None) -> None:
    if not enabled() or not data_uri.startswith("data:"):
        return
    path = _path(key)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
        tmp.write_text(data_uri, encoding="utf-8")
        tmp.replace(path)

        if meta is not None:
            m_path = _meta_path(key)
            m_tmp = m_path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
            m_tmp.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
            m_tmp.replace(m_path)

        _count("store")
    except OSError as exc:
        logger.warning("image cache write failed", error=str(exc)[:120])


def put_record(key: str, data_uri: str, meta: dict[str, Any]) -> None:
    """Almacena la imagen y sus metadatos reales (autor, licencia, URL)."""
    put(key, data_uri, meta=meta)


def stats() -> dict:
    with _lock:
        hits, misses, stores = _counts["hit"], _counts["miss"], _counts["store"]
    total = hits + misses
    return {
        "hits": hits,
        "misses": misses,
        "stores": stores,
        "hit_rate": round(hits / total, 3) if total else 0.0,
    }


def _usage_registry_path() -> Path:
    return cache_dir() / "usage_registry.json"


def record_image_usage(phash: str, query: str) -> None:
    """Registra en disco la consulta para la cual fue elegida una imagen (por hash perceptual)."""
    if not enabled() or not phash or not query:
        return
    reg_path = _usage_registry_path()
    with _lock:
        data: dict[str, list[str]] = {}
        try:
            if reg_path.exists():
                data = json.loads(reg_path.read_text(encoding="utf-8"))
        except Exception:
            data = {}

        queries = data.setdefault(phash, [])
        norm_q = normalize_prompt(query)
        if norm_q not in queries:
            queries.append(norm_q)

        try:
            reg_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = reg_path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(reg_path)
        except OSError as exc:
            logger.warning("failed to write usage registry", error=str(exc)[:120])


def get_image_usage(phash: str) -> list[str]:
    """Obtiene la lista de consultas normalizadas para las cuales ya fue seleccionada esta imagen."""
    if not enabled() or not phash:
        return []
    reg_path = _usage_registry_path()
    try:
        if reg_path.exists():
            data = json.loads(reg_path.read_text(encoding="utf-8"))
            return list(data.get(phash, []))
    except Exception:  # noqa: BLE001 — registro de uso ilegible: se trata como vacío
        pass
    return []

