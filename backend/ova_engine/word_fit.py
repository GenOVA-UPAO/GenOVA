"""Ajuste de longitud de un texto libre (micro-podcast) al nº de palabras pedido (±15 %)."""

from __future__ import annotations

import re

TOLERANCE = 0.15


def count_words(text: str) -> int:
    return len((text or "").split())


def bounds(target: int, tol: float = TOLERANCE) -> tuple[int, int]:
    return max(1, int(target * (1 - tol))), int(target * (1 + tol) + 0.999)


def trim_to_words(text: str, target: int, tol: float = TOLERANCE) -> str:
    """Recorta a lo sumo `target*(1+tol)` palabras, cortando en fin de frase si cabe."""
    text = (text or "").strip()
    lo, hi = bounds(target, tol)
    words = text.split()
    if len(words) <= hi:
        return text
    cut = " ".join(words[:hi])
    sentences = re.split(r"(?<=[.!?…])\s+", cut)
    kept = ""
    for sen in sentences[:-1] if not re.search(r"[.!?…]$", cut) else sentences:
        if count_words(kept + " " + sen) > hi:
            break
        kept = f"{kept} {sen}".strip()
    return kept if count_words(kept) >= lo else cut.rstrip(",;: ") + "."


def fit_words(text: str, target: int, regenerate=None, tol: float = TOLERANCE) -> str:
    """Devuelve `text` con longitud dentro de ±tol. Si es corto y hay `regenerate(text, target)`,
    hace UN reintento de reparación; si es largo (o sigue largo) recorta."""
    lo, hi = bounds(target, tol)
    n = count_words(text)
    if n < lo and regenerate is not None:
        try:
            again = regenerate(text, target)
        except Exception:
            again = ""
        if again and count_words(again) >= n:
            text = again
    return trim_to_words(text, target, tol) if count_words(text) > hi else text
