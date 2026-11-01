"""Endpoint Prometheus `/metrics` (opt-in con METRICS_ENABLED=1).

Render publica un solo puerto: sin protección, cualquiera en internet leía los
contadores por ruta, latencias y tasas de error (qué endpoints de admin/LTI existen
y se usan). Por eso exige `Authorization: Bearer <METRICS_TOKEN>`; sin token
configurado o con uno distinto responde 404, como si el endpoint no existiera.

Con varios procesos (WEB_CONCURRENCY>1) cada scrape devuelve los contadores de un
solo proceso salvo que se defina PROMETHEUS_MULTIPROC_DIR.
"""

from __future__ import annotations

import secrets

from fastapi import Depends, FastAPI, HTTPException, Request, status

from core.config import settings


def require_metrics_token(request: Request) -> None:
    expected = settings.metrics_token
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if not expected or scheme.lower() != "bearer" or not secrets.compare_digest(
        token.strip().encode(), expected.encode()
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")


def setup_metrics(app: FastAPI) -> bool:
    """Instrumenta la app y expone /metrics protegido. False si está apagado."""
    if not settings.metrics_enabled:
        return False
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(
        app,
        endpoint="/metrics",
        include_in_schema=False,
        dependencies=[Depends(require_metrics_token)],
    )
    return True
