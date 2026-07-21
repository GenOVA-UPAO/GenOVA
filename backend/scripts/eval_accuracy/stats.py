"""Agregación de la métrica OE2 e intervalo de confianza.

La precisión es una proporción sobre un N moderado, así que el IC normal
(Wald) se degrada cerca del 100% y puede pasarse de 1.0. Se usa el intervalo de
Wilson, que es el recomendado para este caso.
"""

from __future__ import annotations

import math

from scripts.eval_accuracy.judge import CONTRADICTED, NOT_INFERABLE, SUPPORTED

# Umbral formal del project charter (OE2).
THRESHOLD = 88.67


def wilson_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    """IC 95% de Wilson para una proporción, en porcentaje."""
    if total == 0:
        return (0.0, 0.0)
    p = successes / total
    denom = 1 + z**2 / total
    centre = (p + z**2 / (2 * total)) / denom
    margin = z * math.sqrt(p * (1 - p) / total + z**2 / (4 * total**2)) / denom
    return (max(0.0, (centre - margin)) * 100, min(1.0, (centre + margin)) * 100)


def summarize(rows: list[dict]) -> dict:
    """Agrega los veredictos. Las filas con `error` quedan fuera del denominador:
    un fallo del juez no es un fallo de precisión del generador."""
    judged = [r for r in rows if r.get("veredicto") in {SUPPORTED, CONTRADICTED, NOT_INFERABLE}]
    total = len(judged)
    supported = sum(1 for r in judged if r["veredicto"] == SUPPORTED)
    contradicted = sum(1 for r in judged if r["veredicto"] == CONTRADICTED)
    not_inferable = sum(1 for r in judged if r["veredicto"] == NOT_INFERABLE)
    errors = len(rows) - total

    accuracy = (supported / total * 100) if total else 0.0
    low, high = wilson_interval(supported, total)
    return {
        "afirmaciones_juzgadas": total,
        "soportadas": supported,
        "contradichas": contradicted,
        "no_inferibles": not_inferable,
        "errores_juez": errors,
        "accuracy_pct": round(accuracy, 2),
        "ic95_pct": [round(low, 2), round(high, 2)],
        "umbral_pct": THRESHOLD,
        # El umbral se declara alcanzado solo si el extremo inferior del IC lo
        # supera: con la estimación puntual sola, un N pequeño "cumple" por azar.
        "cumple_umbral": low > THRESHOLD,
        "cumple_estimacion_puntual": accuracy > THRESHOLD,
    }


def breakdown(rows: list[dict], key: str) -> dict:
    """Mismo resumen desglosado por `key` (p. ej. 'phase' o 'resource_type')."""
    groups: dict[str, list[dict]] = {}
    for row in rows:
        groups.setdefault(str(row.get(key, "?")), []).append(row)
    return {k: summarize(v) for k, v in sorted(groups.items())}
