"""Tiempo restante estimado de un job (puro, sin I/O).

Cada recurso pendiente/en curso aporta su duración típica (mediana histórica por
fase:tipo; si no hay historial, la mediana de los demás tipos conocidos y, sin
ningún dato, un valor por defecto marcado como `estimado`). Los recursos se
reparten en `concurrency` carriles: los en curso ocupan un carril el tiempo que
les quede y los pendientes entran en el carril que antes se libere.
"""

from __future__ import annotations

import heapq
import statistics
from dataclasses import dataclass

DEFAULT_SECONDS = 45.0
OVERDUE_FRACTION = 0.5  # un recurso que ya superó su mediana no «termina en 0»: se supone otra media mediana
OVERDUE_MIN_SECONDS = 10.0


@dataclass(frozen=True, slots=True)
class EtaItem:
    key: str  # fase:tipo
    status: str  # pending | running
    elapsed: float = 0.0  # segundos desde que empezó (solo running)


@dataclass(frozen=True, slots=True)
class Eta:
    seconds: int
    basis: str  # "historial" (todo con mediana propia) | "estimado" (alguna sin datos)

    def as_dict(self) -> dict:
        return {"seconds": self.seconds, "basis": self.basis}


def estimate_remaining(
    items: list[EtaItem], medians: dict[str, float], concurrency: int
) -> Eta | None:
    """None si no queda nada por generar."""
    open_items = [i for i in items if i.status in ("pending", "running")]
    if not open_items:
        return None
    fallback = statistics.median(medians.values()) if medians else DEFAULT_SECONDS
    exact = all(i.key in medians for i in open_items)
    overdue = False

    lanes = max(1, min(concurrency, len(open_items)))
    heap: list[float] = [0.0] * lanes
    heapq.heapify(heap)
    # los en curso primero: ya ocupan sus carriles
    ordered = sorted(open_items, key=lambda i: 0 if i.status == "running" else 1)
    for item in ordered:
        typical = medians.get(item.key, fallback)
        if item.status == "running":
            if item.elapsed >= typical:
                overdue = True
                duration = max(typical * OVERDUE_FRACTION, OVERDUE_MIN_SECONDS)
            else:
                duration = typical - item.elapsed
        else:
            duration = typical
        start = heapq.heappop(heap)
        heapq.heappush(heap, start + duration)
    return Eta(seconds=round(max(heap)), basis="historial" if exact and not overdue else "estimado")
