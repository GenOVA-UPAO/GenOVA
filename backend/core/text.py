"""Utilidades de texto compartidas."""


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
