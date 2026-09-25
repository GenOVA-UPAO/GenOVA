"""URLs de la API de OpenRouter, a partir de `settings.openrouter_api_base`.

Todo lo que habla con OpenRouter (texto, imagen, voz, video y catálogo) usa
estas funciones en vez de escribir «https://openrouter.ai» a mano: así un
servidor compatible en local (scripts/fake_openrouter) puede sustituirlo entero.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from core.config import settings

_LOOPBACK = frozenset({"localhost", "127.0.0.1", "::1"})


def api_base() -> str:
    return (settings.openrouter_api_base or "https://openrouter.ai/api/v1").rstrip("/")


def api_url(path: str) -> str:
    """URL de un endpoint: api_url("images") → https://openrouter.ai/api/v1/images."""
    return f"{api_base()}/{path.lstrip('/')}"


def origin() -> str:
    """Esquema y host de la API, para completar rutas relativas («/api/v1/…»)."""
    parts = urlsplit(api_base())
    return f"{parts.scheme}://{parts.netloc}"


def is_api_url(url: str) -> bool:
    """`url` va al host de la API. Con HTTPS; HTTP solo si la API es local."""
    parts = urlsplit(url or "")
    host = parts.hostname or ""
    if host not in {"openrouter.ai", urlsplit(api_base()).hostname}:
        return False
    return parts.scheme == "https" or (parts.scheme == "http" and host in _LOOPBACK)
