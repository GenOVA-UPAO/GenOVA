"""Detección barata de deriva de tema entre el prompt del OVA y el <h1>.

Conservadora a propósito: solo marca desvío cuando el título no comparte
ningún token significativo con el prompt (ni como subcadena). Temas de una
sola palabra se saltan — parafrasear "Fotosíntesis" como "La planta verde"
daría demasiados falsos positivos; el anclaje del prompt cubre ese caso.
"""

from __future__ import annotations

import re
import unicodedata

_STOP = frozenset(
    {
        "este",
        "esta",
        "estos",
        "estas",
        "para",
        "como",
        "sobre",
        "entre",
        "desde",
        "hasta",
        "donde",
        "cuando",
        "porque",
        "pero",
        "cual",
        "cuales",
        "todo",
        "toda",
        "todos",
        "todas",
        "otro",
        "otra",
        "otros",
        "otras",
        "una",
        "unos",
        "unas",
        "del",
        "los",
        "las",
        "por",
        "con",
        "sin",
        "que",
        "muy",
        "mas",
        "menos",
        "the",
        "and",
        "for",
        "with",
        "from",
        "that",
        "this",
        "aplicado",
        "aplicada",
        "recurso",
        "introduccion",
        "actividad",
    }
)


def _fold(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def significant_tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", _fold(text)) if len(w) >= 4 and w not in _STOP}


def _first_h1(html: str) -> str:
    match = re.search(r"<h1\b[^>]*>(.*?)</h1>", html, flags=re.I | re.S)
    if not match:
        return ""
    return re.sub(r"<[^>]+>", " ", match.group(1)).strip()


def topic_drift_defect(html: str, prompt: str) -> str | None:
    """None si no hay señal fiable; str si el <h1> no relaciona con el prompt."""
    if not html or not prompt:
        return None
    title = _first_h1(html)
    if not title:
        return None
    prompt_toks = significant_tokens(prompt)
    if len(prompt_toks) < 2:
        return None
    title_toks = significant_tokens(title)
    if not title_toks:
        return None
    if prompt_toks & title_toks:
        return None
    title_fold = _fold(title)
    if any(token in title_fold for token in prompt_toks):
        return None
    prompt_fold = _fold(prompt)
    if any(len(token) >= 6 and token in prompt_fold for token in title_toks):
        return None
    return f'tema desviado: el título "{title}" no guarda relación con el prompt del OVA'
