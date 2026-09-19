"""Presupuesto de reloj por recurso de generación.

El techo por rondas (_REFINE_MAX_ROUNDS=2) no basta: `repair` regenera entero
y vuelve a refinar, así que un recurso patológico suma 6+ llamadas LLM de
30-120s cada una. Este presupuesto corta refine/repair cuando se agota y se
queda con el mejor HTML que haya.

Default 90s: el 95% de recursos sanos termina en 24-60s y no se toca; 90s
deja holgura para UNA ronda de refine en un generate de ~50s, y corta la
segunda ronda + el regen de repair que inflaba un recurso a >10 min.
"""

from __future__ import annotations

import time

DEFAULT_RESOURCE_BUDGET_S = 90.0
# No arrancar otra llamada LLM si queda menos que esto: una completion típica
# ronda 30s y no vale la pena empezar una ronda que vamos a recortar.
MIN_LLM_SLACK_S = 20.0


def budget_seconds(raw: float | None = None) -> float:
    """Segundos de presupuesto. `raw` inyectable en tests; si falta, settings."""
    if raw is None:
        from core.config import settings

        raw = float(settings.ova_resource_budget_s)
    return max(1.0, float(raw))


def deadline_at(started: float, budget_s: float | None = None) -> float:
    return started + budget_seconds(budget_s)


def remaining(deadline: float, now: float | None = None) -> float:
    return deadline - (time.monotonic() if now is None else now)


def can_spend(deadline: float | None, now: float | None = None, slack_s: float = MIN_LLM_SLACK_S) -> bool:
    """True si cabe otra llamada LLM dentro del presupuesto."""
    if deadline is None:
        return True
    return remaining(deadline, now) >= slack_s
