"""HTTP middlewares extracted from main.py (line-limit / layering)."""

from __future__ import annotations

import time

import structlog
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings

logger = structlog.get_logger(__name__)

_LATENCY_THRESHOLD_MS = settings.latency_threshold_ms
_LATENCY_EXCLUDED_PREFIXES = ("/api/agents/", "/api/ovas/save", "/api/ova/save")
_IS_PROD = settings.env.lower() == "production"


class ProcessTimeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        t0 = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - t0) * 1000
        response.headers["X-Process-Time-Ms"] = f"{ms:.1f}"
        if ms > _LATENCY_THRESHOLD_MS and not any(
            request.url.path.startswith(p) for p in _LATENCY_EXCLUDED_PREFIXES
        ):
            logger.warning(
                "SLOW request",
                method=request.method,
                path=request.url.path,
                ms=round(ms, 1),
                threshold_ms=_LATENCY_THRESHOLD_MS,
            )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Cabeceras de seguridad en todas las respuestas (OWASP). CSP/HSTS solo en
    producción: la API sirve JSON (default-src 'none' es seguro) y HSTS requiere
    HTTPS. En dev se omiten para no romper Swagger /docs."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if _IS_PROD:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
            response.headers.setdefault(
                "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
            )
        return response
