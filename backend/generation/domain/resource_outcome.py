"""Reglas puras: qué estado persistir tras generar un recurso.

El HTML defectuoso se conserva; miente el ESTADO si se marca `done` con
contenido que el validador rechazó. `degraded` es terminal (el job puede
cerrar) y reanudable (el resume lo recoge), sin reutilizar `error` (fallo
duro sin HTML) ni `pending` (aún no intentado).
"""

from __future__ import annotations

RESOURCE_DEGRADED = "degraded"
CONTENT_READY_STATUSES = ("done", RESOURCE_DEGRADED)
MATERIALIZABLE_STATUSES = ("done", RESOURCE_DEGRADED)


def persist_status(*, html: str | None, defects: list[str] | None) -> str:
    """Estado de fila tras un intento: done | degraded | error."""
    if html and not defects:
        return "done"
    if html:
        return RESOURCE_DEGRADED
    return "error"


def defect_reason(defects: list[str] | None) -> str | None:
    """Motivo consultable por API. None si no hay defectos."""
    if not defects:
        return None
    return "; ".join(d.strip() for d in defects if d and d.strip()) or None


def is_content_ready(status: str, html: str | None) -> bool:
    """El HTML se puede servir (done o degradado con cuerpo)."""
    return status in CONTENT_READY_STATUSES and bool(html)
