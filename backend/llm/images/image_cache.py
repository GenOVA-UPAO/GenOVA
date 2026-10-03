"""Caché de imágenes generadas (disco): reutiliza al regenerar o repetir el mismo prompt.

Clave = sha256(prompt normalizado + estilo + modelo + tamaño). La semilla NO entra en la
clave: el mismo prompt con el mismo estilo es «la misma imagen» aunque venga de otro OVA.
Guarda el data URI tal cual (los HTML del OVA son autocontenidos). Escritura atómica; un
fallo de disco nunca rompe la generación (se trata como fallo de caché).
Métricas: contador Prometheus `genova_image_cache_total{result}` + `stats()`.
"""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
import threading
from pathlib import Path

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


def put(key: str, data_uri: str) -> None:
    if not enabled() or not data_uri.startswith("data:"):
        return
    path = _path(key)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(f".{os.getpid()}.{threading.get_ident()}.tmp")
        tmp.write_text(data_uri, encoding="utf-8")
        tmp.replace(path)
        _count("store")
    except OSError as exc:
        logger.warning("image cache write failed", error=str(exc)[:120])


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
