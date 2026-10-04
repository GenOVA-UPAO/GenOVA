"""Detección barata de deriva de tema entre el prompt del OVA y el <h1>.

Conservadora a propósito: solo marca desvío cuando el título no comparte
ningún token significativo con el prompt (ni como subcadena). Temas de una
sola palabra se saltan — parafrasear "Fotosíntesis" como "La planta verde"
daría demasiados falsos positivos; el anclaje del prompt cubre ese caso.
"""

from __future__ import annotations

import html as html_lib
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
        "les",
        "sus",
        "son",
        "hay",
        "fue",
        "era",
        "ser",
        "eso",
        "esa",
        "ese",
        "ver",
        "uso",
        "dos",
        "tres",
        "cada",
        "nivel",
        "tema",
    }
)


def _fold(text: str) -> str:
    nfd = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def significant_tokens(text: str) -> set[str]:
    # 3 letras: "ley", "ohm", "adn", "pib" son núcleo del tema en muchos cursos.
    return {w for w in re.findall(r"[a-z0-9]+", _fold(text)) if len(w) >= 3 and w not in _STOP}


_HIDDEN_OPEN = re.compile(r"<(script|style|head)", re.I)
# `<` excluido dentro de la etiqueta: con `<[^>]+>` una cadena de muchos `<` sin
# `>` era cuadrática (CodeQL py/polynomial-redos).
_TAG = re.compile(r"<[^<>]+>")


def _strip_hidden_blocks(html: str) -> str:
    """Quita los bloques <script>/<style>/<head> en tiempo lineal.

    Equivale a `re.sub(r"<(script|style|head)[\\s\\S]*?</\\1>", " ", html, flags=re.I)`,
    que era cuadrático con muchas aperturas sin cierre (CodeQL py/polynomial-redos).
    """
    lower = html.lower()
    unclosed: set[str] = set()
    parts: list[str] = []
    pos = 0
    search_from = 0
    while match := _HIDDEN_OPEN.search(html, search_from):
        tag = match.group(1).lower()
        end = -1 if tag in unclosed else lower.find(f"</{tag}>", match.end())
        if end == -1:
            # Sin cierre posterior: ninguna apertura siguiente de este tag cerrará.
            unclosed.add(tag)
            search_from = match.start() + 1
            continue
        parts.append(html[pos : match.start()])
        parts.append(" ")
        pos = search_from = end + len(tag) + 3
    parts.append(html[pos:])
    return "".join(parts)


def _lead_text(html: str, limit: int = 800) -> str:
    """Primer tramo del texto visible: el titular puede ser creativo (noticia,
    cómic) y el tema aparece en la entradilla."""
    body = _strip_hidden_blocks(html)
    return re.sub(r"\s+", " ", _TAG.sub(" ", body))[:limit]


def _first_h1(html: str) -> str:
    """Titular visible: <h1> fuera de scripts/estilos, o el `title` de la cabecera
    UPAO (upao-header / upao-card renderizan el h1 desde JS). Antes el regex
    encontraba el `<h1>${title}</h1>` del runtime de componentes."""
    body = _strip_hidden_blocks(html)
    match = re.search(r"<h1\b[^>]*>(.*?)</h1>", body, flags=re.I | re.S)
    if match:
        return _TAG.sub(" ", match.group(1)).strip()
    match = re.search(r"<upao-(?:header|card)\b[^>]*\btitle=\"([^\"]*)\"", body, flags=re.I)
    return html_lib.unescape(match.group(1)).strip() if match else ""


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
    title_toks = significant_tokens(title) | significant_tokens(_lead_text(html))
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
