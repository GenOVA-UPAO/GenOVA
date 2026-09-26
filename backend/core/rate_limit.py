"""Limitador SlowAPI compartido, por IP del cliente. Los routers importan `limiter`
y decoran con `@limiter.limit("N/minute")`; main.py lo engancha a la app.

Almacén (`storage_uri`): con REDIS_URL, Redis (el mismo que usa la cola arq), y
los límites valen para todos los procesos e instancias; sin él, la memoria de
cada proceso — exacto con un solo proceso (el despliegue de render.yaml), laxo
con varios (ver `per_process_limits_warning`).

RATE_LIMIT_ENABLED=0 lo apaga del todo (pruebas de carga, e2e masivos en CI);
nunca en producción."""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping, Sequence

import structlog
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import settings

logger = structlog.get_logger(__name__)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri=settings.redis_url or None,
    enabled=settings.rate_limit_enabled,
)


def _as_int(value: str | None) -> int:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def configured_workers(
    argv: Sequence[str] | None = None, environ: Mapping[str, str] | None = None
) -> int:
    """Procesos web que se piden al arrancar (1 si no se ve ninguna pista).

    uvicorn toma ``--workers`` de la línea de órdenes, de ``UVICORN_WORKERS`` o de
    ``WEB_CONCURRENCY``; gunicorn usa ``-w``/``--workers``. Cada worker de uvicorn
    nace con ``multiprocessing`` en modo *spawn*, que le copia el ``sys.argv`` del
    padre, así que la cuenta sale igual en el maestro y en los workers. Varias
    instancias (``numInstances`` en Render) no se ven desde aquí: se documenta.
    """
    argv = sys.argv if argv is None else argv
    environ = os.environ if environ is None else environ
    counts = [_as_int(environ.get("WEB_CONCURRENCY")), _as_int(environ.get("UVICORN_WORKERS"))]
    for i, arg in enumerate(argv):
        if arg in ("--workers", "-w") and i + 1 < len(argv):
            counts.append(_as_int(argv[i + 1]))
        elif arg.startswith("--workers="):
            counts.append(_as_int(arg.split("=", 1)[1]))
    return max([1, *counts])


def per_process_limits_warning(*, env: str, redis_url: str, workers: int) -> str | None:
    """Texto del aviso si los límites quedan por proceso en producción; si no, None.

    Sin REDIS_URL, SlowAPI cuenta en la memoria de cada proceso: con N workers el
    límite por IP real es N veces mayor. (Las ventanas de `core.shared_throttle`
    —login por email, «Probar un modelo»— sí se comparten vía Postgres.)
    """
    if env.lower() != "production" or redis_url or workers <= 1:
        return None
    return (
        f"{workers} procesos web sin REDIS_URL: el límite por IP (SlowAPI) cuenta en "
        f"la memoria de cada proceso y en la práctica es {workers} veces mayor. "
        "Define REDIS_URL (y arranca el worker arq: con REDIS_URL la generación se "
        "encola) o deja un solo proceso (sin WEB_CONCURRENCY ni --workers)."
    )


# Al importarse este módulo (arranque de cada proceso web), como el aviso de
# FRONTEND_URL en auth.infrastructure.email_adapters: un error de despliegue que
# no rompe nada visible pero afloja la protección contra abuso.
_warning = per_process_limits_warning(
    env=settings.env, redis_url=settings.redis_url, workers=configured_workers()
)
if _warning:
    logger.warning("rate limits per process", detail=_warning)
