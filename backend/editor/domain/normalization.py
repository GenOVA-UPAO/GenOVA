"""Normalización canónica, sinónimos, ordinales y detección de patrones."""

from __future__ import annotations

import re
import unicodedata
from typing import Any

SEARCH_STOPWORDS: frozenset[str] = frozenset({
    "a", "e", "y", "o", "u",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en", "para", "por", "con", "sin", "sobre",
    "que", "cual", "donde", "quien", "como", "cuando", "habla", "explica", "cuenta", "dice", "muestra", "trata",
    "panel", "vineta", "pregunta", "ejemplo", "parrafo", "bloque", "cuadro", "texto", "caso",
    "quitar", "quitalo", "quitala", "quitarlo", "quitarla", "quitarlos", "quitarlas", "borrar", "borralo", "borrala", "borrarlo", "borrarla",
    "eliminar", "eliminalo", "eliminala", "eliminarlo", "eliminarla", "sacar", "sacalo", "sacala", "sacarlo", "sacarla",
    "mover", "muevelo", "muevela", "moverlo", "moverla", "pasar", "pasalo", "pasala", "pasarlo", "pasarla", "pasa", "pase",
    "poner", "ponlo", "ponla", "ponerlo", "ponerla", "colocar", "colocalo", "colocala", "colocarlo", "colocarla",
    "lo", "le", "les", "me", "te", "se", "nos", "mi", "mis", "tu", "tus", "su", "sus", "porfa", "favor", "nomas",
    "antes", "despues", "primero", "primera", "segundo", "segunda", "ultimo", "ultima", "muy", "es", "son", "al",
})

_TYPE_MAP: dict[str, str] = {
    "p": "paragraph",
    "paragraph": "paragraph",
    "parrafo": "paragraph",
    "introduccion": "paragraph",
    "intro": "paragraph",
    "header": "header",
    "encabezado": "header",
    "titulo": "header",
    "example": "example",
    "ejemplo": "example",
    "caso": "example",
    "question": "question",
    "pregunta": "question",
    "quiz": "question",
    "item": "question",
    "reactivo": "question",
    "summary": "summary",
    "resumen": "summary",
    "sintesis": "summary",
    "conclusion": "summary",
    "conclusiones": "summary",
    "cierre": "summary",
    "resultado": "summary",
    "resultados": "summary",
    "comic-panel": "panel",
    "panel": "panel",
    "vineta": "panel",
    "cuadro": "panel",
    "tira": "panel",
    "steps": "steps",
    "pasos": "steps",
    "objective": "objective",
    "objetivo": "objective",
    "reveal": "reveal",
    "revelar": "reveal",
    "card": "card",
    "tarjeta": "card",
}

_WORD_ORDINALS: dict[str, int | str] = {
    "ultimo": "ultimo",
    "ultima": "ultimo",
    "final": "ultimo",
    "la de abajo": "ultimo",
    "el de abajo": "ultimo",
    "penultimo": "penultimo",
    "penultima": "penultimo",
    "antepenultimo": "antepenultimo",
    "antepenultima": "antepenultimo",
    "primero": 1,
    "primera": 1,
    "primer": 1,
    "uno": 1,
    "1": 1,
    "la de arriba": 1,
    "el de arriba": 1,
    "segundo": 2,
    "segunda": 2,
    "dos": 2,
    "2": 2,
    "tercero": 3,
    "tercera": 3,
    "tercer": 3,
    "tres": 3,
    "3": 3,
    "cuarto": 4,
    "cuarta": 4,
    "cuatro": 4,
    "4": 4,
    "quinto": 5,
    "quinta": 5,
    "cinco": 5,
    "5": 5,
    "sexto": 6,
    "sexta": 6,
    "seis": 6,
    "6": 6,
    "septimo": 7,
    "septima": 7,
    "siete": 7,
    "7": 7,
    "octavo": 8,
    "octava": 8,
    "ocho": 8,
    "8": 8,
    "noveno": 9,
    "novena": 9,
    "nueve": 9,
    "9": 9,
    "decimo": 10,
    "decima": 10,
    "diez": 10,
    "10": 10,
}

_ENCLITICS_MOVE = re.compile(
    r"\b(mueve|mueva|sube|suba|baja|pasa|coloca|coloque|ubica|pon)(la|lo|las|los|le|les|me)\b",
    re.IGNORECASE,
)
_ENCLITICS_REMOVE = re.compile(
    r"\b(saca|saque|quita|quite|borra|borre|elimina|elimine|suprime|suprima)(la|lo|las|los|le|les|me)\b",
    re.IGNORECASE,
)
_ENCLITICS_ADD = re.compile(
    r"\b(anade|agrega|inserta|incluye)(la|lo|las|los|le|les|me)\b",
    re.IGNORECASE,
)
_REPEATED_CHARS = re.compile(r"([a-z])\1{2,}", re.IGNORECASE)
_COURTESY_FILLERS = re.compile(r"\b(?:por\s+favor|porfa|plis|please|gracias)\b", re.IGNORECASE)
_REGIONAL_FILLERS = re.compile(r"\bno\s+mas\b|\bnomas\b", re.IGNORECASE)


def levenshtein(a: str, b: str) -> int:
    """Distancia de Levenshtein entre dos cadenas para tolerancia tipográfica."""
    an, bn = len(a), len(b)
    if an == 0:
        return bn
    if bn == 0:
        return an
    v0 = list(range(bn + 1))
    v1 = [0] * (bn + 1)
    for i in range(an):
        v1[0] = i + 1
        for j in range(bn):
            cost = 0 if a[i] == b[j] else 1
            v1[j + 1] = min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
        v0[:] = v1[:]
    return v0[bn]


def expand_enclitics(text: str) -> str:
    """Expansión de verbos con pronombres enclíticos: 'muevela' -> 'mueve la'."""
    text = _ENCLITICS_MOVE.sub(r"\1 \2", text)
    text = _ENCLITICS_REMOVE.sub(r"\1 \2", text)
    return _ENCLITICS_ADD.sub(r"\1 \2", text)


def reduce_repeated_chars(text: str) -> str:
    """Elimina repeticiones anómalas de caracteres: 'boorra' -> 'borra'."""
    return _REPEATED_CHARS.sub(r"\1", text)


def normalize_text(text: str) -> str:
    """Normalización canónica: minúsculas, sin tildes, sin controles, expansión enclíticos."""
    if not text:
        return ""
    nfd = unicodedata.normalize("NFD", text.lower())
    clean = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    clean = "".join(c for c in clean if ord(c) >= 32 or c in "\n\t")
    clean = reduce_repeated_chars(clean)
    clean = expand_enclitics(clean)
    clean = _REGIONAL_FILLERS.sub(" ", clean)
    clean = _COURTESY_FILLERS.sub(" ", clean)
    return " ".join(clean.split())


def normalize_type(raw_type: str | None) -> str:
    """Normaliza el tipo de bloque a su nombre canónico interno."""
    if not raw_type:
        return ""
    t = raw_type.lower().strip()
    if t.startswith("upao-"):
        t = t[5:]
    return _TYPE_MAP.get(t, t)


def parse_ordinal_value(val: Any) -> int | str | None:
    """Parsea un valor ordinal numérico o literal ('ultimo', 'penultimo', 1, 2, ...)."""
    if val is None:
        return None
    if isinstance(val, int):
        return val
    s = normalize_text(str(val))
    if s in _WORD_ORDINALS:
        return _WORD_ORDINALS[s]
    if s.isdigit():
        return int(s)
    return None


def normalize_search_string(text: str) -> str:
    """Normaliza un texto para búsqueda difusa por contenido o título."""
    clean = normalize_text(text)
    clean = re.sub(r"[^a-z0-9\s]", " ", clean)
    return " ".join(clean.split())


def has_multiple_actions(instruction: str) -> bool:
    """Detecta múltiples acciones coordinadas: 'quita el ejemplo y mueve la pregunta'."""
    norm = normalize_text(instruction)
    verbs = (
        r"(?:quita|quitar|borra|borrar|elimina|eliminar|saca|sacar|suprime|"
        r"mueve|mover|pon|poner|coloca|colocar|sube|baja|pasa|anade|anadir|agrega|agregar|inserta)"
    )
    pattern = rf"\b{verbs}\b.*\b(?:y|e|ademas|luego)(?:\s+despues)?\s+{verbs}\b"
    return bool(re.search(pattern, norm, re.IGNORECASE))


def is_generative_content_request(instruction: str) -> bool:
    """Detecta peticiones de generación/redacción libre de contenido nuevo."""
    norm = normalize_text(instruction)
    has_rel_desc = bool(re.search(r"\bque\s+(?:explica|describe|cuenta)\b", norm, re.IGNORECASE))
    edit_verbs = (
        r"\b(?:pasa|pasal[oa]|mueve|muevel[oa]|quita|quital[oa]|borra|borral[oa]|"
        r"elimina|eliminal[oa]|saca|sacal[oa]|sube|baja|coloca|pon|ponl[oa])\b"
    )
    has_edit_verb = bool(re.search(edit_verbs, norm, re.IGNORECASE))
    if has_rel_desc and has_edit_verb:
        return False  # preserves structural edit with descriptive relative clause

    generative_patterns = (
        r"\b(?:escribe\b|redacta\b|inventa\b|cuenta\s+un\b|poema\b|cancion\b|cuento\b|"
        r"historia\b|dime\s+como\b|genera\s+un\b)\b"
    )
    if re.search(generative_patterns, norm, re.IGNORECASE):
        return True
    return bool(re.match(r"^(?:explica\b|describe\b|redacta\b)", norm, re.IGNORECASE) and not has_edit_verb)
