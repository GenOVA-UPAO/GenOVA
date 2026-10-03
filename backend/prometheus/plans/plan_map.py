"""Fuente única del plan de ejecución por recurso.

Todos los 49 recursos 5E tienen plantilla determinista (`TEMPLATE`).
El único recurso especial es `engage:3` (`PODCAST`), que genera audio/guion.
No existe degradación a planes legacy (`two_step` / `direct_code`).
"""

PODCAST = "podcast"
TEMPLATE = "template"
# Constantes conservadas por compatibilidad
DIRECT_CODE = "direct_code"
TWO_STEP = "two_step"

_PODCAST = {("engage", 3)}


def plan_for(phase: str, rt) -> str:
    """Plan de ejecución canónico para un recurso."""
    n = int(rt)
    if (phase, n) in _PODCAST:
        return PODCAST
    return TEMPLATE


def degraded_plan(phase: str, rt, current: str) -> str | None:
    """No hay degradación a planes legacy: todos los recursos son plantillas o podcast."""
    return None
