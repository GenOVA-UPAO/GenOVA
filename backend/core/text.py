"""Utilidades de texto compartidas."""

import re


def smart_truncate(text: str, limit: int = 80) -> str:
    """Trunca `text` a `limit` caracteres sin partir palabras.

    Corta en el último espacio dentro del límite y añade "…" solo si hubo
    recorte; los títulos de OVA dejaban de leerse a media palabra
    ("…universitarios d") porque el corte era `text[:80]` a secas.
    """
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0].rstrip(" ,;:.")
    return f"{cut}…"


_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
# Por debajo de esto la «primera frase» suele ser un fragmento suelto
# («Ley de Ohm.») al que le falta contexto: se usa la línea entera.
_MIN_TITLE_SENTENCE = 12


def ova_title(prompt: str, limit: int = 80) -> str:
    """Título de un OVA a partir del prompt del docente: su primera frase.

    Los prompts suelen ser «Tema. Objetivos: …»: con 80 caracteres a secas
    el título arrastraba media frase de objetivos y en la biblioteca todos
    acababan en «Objetivos…». Se toma la primera línea, de ella la primera
    frase si tiene cuerpo suficiente, sin el punto final, y se trunca por
    palabra como antes.
    """
    line = next((ln.strip() for ln in prompt.splitlines() if ln.strip()), "")
    first = _SENTENCE_END.split(line, maxsplit=1)[0].rstrip(".")
    title = first if len(first) >= _MIN_TITLE_SENTENCE else line
    return smart_truncate(title, limit)
