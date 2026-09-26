"""Reglas puras del progreso de una regeneración (etiquetas + estimación).

Fuente única para el DTO de progreso del endpoint de regen. La estimación es
lineal sobre segundos estimados por fase; los umbrales de etiqueta son los
mismos que pintaba el frontend desde siempre.
"""

from __future__ import annotations

PROGRESS_STAGES = [
    (10, "Iniciando regeneración"),
    (35, "Procesando contenido"),
    (65, "Generando fases seleccionadas"),
    (90, "Reconstruyendo paquete SCORM"),
    (100, "Finalizando"),
]

# Estimated seconds per resource for real LLM regeneration.
EST_SECONDS_PER_PHASE = 60

_TERMINAL_STATUSES = frozenset({"success", "error"})

# Suelo del porcentaje según el paso real que registra el ejecutor en la BD. La
# estimación por tiempo sola decía «Generando fases» mientras ya se construía el
# paquete; con el paso compartido entre procesos la etiqueta no se queda atrás.
_STEP_FLOORS = {"persist": 90}


def resolve_regen_stage(pct: int) -> str:
    for threshold, label in PROGRESS_STAGES:
        if pct <= threshold:
            return label
    return PROGRESS_STAGES[-1][1]


def estimate_percentage(
    *, status: str, total_phases, started_at: float, now: float, step: str | None = None
) -> int:
    """Porcentaje estimado: 100 en terminal; si no, tiempo transcurrido sobre
    el estimado por fase (con el suelo del paso real, si lo hay), saturado en 99
    (el cierre real lo pone el ejecutor)."""
    if status in _TERMINAL_STATUSES:
        return 100
    n_phases = max(int(total_phases or 1), 1)
    est_total = n_phases * EST_SECONDS_PER_PHASE
    elapsed = max(0.0, now - float(started_at))
    by_time = int((elapsed / est_total) * 100)
    return min(99, max(by_time, _STEP_FLOORS.get(step or "", 0)))


def is_terminal(status: str) -> bool:
    return status in _TERMINAL_STATUSES
