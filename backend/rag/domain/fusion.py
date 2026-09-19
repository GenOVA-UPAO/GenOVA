"""Reciprocal Rank Fusion (RRF) — lógica pura, sin red ni base de datos.

Fusiona varias listas ordenadas de candidatos en una sola. El score de cada
elemento es la suma de 1/(k + rank) sobre las listas donde aparece (rank
1-indexed); el orden final es descendente por score.

Se elige RRF frente a combinar puntuaciones (coseno vs ts_rank) porque NO
exige normalizar dos espacios de puntuación incompatibles — el punto donde
suelen romperse las híbridas caseras. k=60 es el valor habitual (Cormack et
al., 2009); con k alto la posición exacta pesa poco y manda el consenso entre
ramas.
"""

from __future__ import annotations

from collections.abc import Hashable
from typing import TypeVar

RRF_K = 60

T = TypeVar("T", bound=Hashable)


def reciprocal_rank_fusion(
    ranked_lists: list[list[T]],
    k: int = RRF_K,
) -> list[T]:
    """Fusiona listas ordenadas (cada una ya top-N de su rama) por RRF.

    - ``rank`` de un elemento dentro de una lista es su posición 1-indexed.
    - ``score`` = suma de ``1 / (k + rank)`` en cada lista donde aparece.
    - Empates: gana quien apareció antes en la primera lista que contiene a
      ambos (desempate estable y determinista por orden de aparición global).
    - Listas vacías se ignoran; si todas lo están, devuelve [].
    - Deduplicación: un elemento repetido dentro de la MISMA lista cuenta una
      sola vez (su mejor posición).
    """
    if k <= 0:
        raise ValueError("k must be positive")
    scores: dict[T, float] = {}
    first_seen: dict[T, int] = {}
    order = 0
    for lst in ranked_lists:
        rank = 0
        prev: T | None = None
        for item in lst:
            if item == prev:
                continue  # dedup consecutivo: la repetición no sube el rank
            prev = item
            rank += 1
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + rank)
            if item not in first_seen:
                first_seen[item] = order
                order += 1
    return sorted(scores, key=lambda x: (-scores[x], first_seen[x]))


def sanitize_websearch_query(query: str, max_chars: int = 256) -> str:
    """Normaliza la consulta del usuario para websearch_to_tsquery.

    Colapsa espacios y recorta a ``max_chars``: la consulta llega tal cual del
    concepto del usuario y puede traer saltos de línea; websearch_to_tsquery
    ya es tolerante a ruido, aquí solo acotamos el tamaño (defensa ante
    consultas patológicas) y devolvemos "" para entradas vacías.
    """
    if not query:
        return ""
    collapsed = " ".join(query.split())
    return collapsed[:max_chars]
