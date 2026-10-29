"""Área temática vigente, accesible desde cualquier módulo sin importar `generation`.

`generation` es quien sabe leer la configuración (guardarraíles de Configuración); `llm`
no puede importarla (import-linter). `main.py` registra aquí el proveedor al arrancar y
quien necesite el área llama a `active_topic_area()`. Sin proveedor devuelve "".
"""

from __future__ import annotations

from collections.abc import Callable

import structlog

logger = structlog.get_logger(__name__)

_provider: Callable[[], str] | None = None


def set_topic_area_provider(provider: Callable[[], str] | None) -> None:
    global _provider
    _provider = provider


def active_topic_area() -> str:
    """El área vigente, o "" si no hay proveedor, no hay área o la lectura falla."""
    if _provider is None:
        return ""
    try:
        return _provider() or ""
    except Exception:  # el área solo orienta: nunca debe romper una generación
        logger.warning("topic area provider failed", exc_info=True)
        return ""
