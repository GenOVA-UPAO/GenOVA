"""Segmentación de peticiones y extracción determinista de acción, tipo, ordinal y destino."""

from __future__ import annotations

import re

from editor.domain.model import IntentDestino, IntentDestinoRef, ResourceBlock
from editor.domain.normalization import (
    levenshtein,
    normalize_text,
    normalize_type,
    parse_ordinal_value,
)

_MARKER_REGEX = re.compile(
    r"\b(al\s+principio|al\s+inicio|al\s+comienzo|arriba(?:\s+del\s+todo)?|al\s+final(?:\s+de\s+todo)?|"
    r"al\s+cierre|al\s+fondo|antes\s+de(?:l)?|despues\s+de(?:l)?|debajo\s+de(?:l)?|encima\s+de(?:l)?|"
    r"hasta(?:\s+el)?|de\s+primer[oa]|en\s+primer\s+lugar|a\s+la|al|abajo|arriba)\b",
    re.IGNORECASE,
)

_TYPE_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(objetivos?|metas?|aprendizaje)\b", re.IGNORECASE), "objective"),
    (re.compile(r"\b(resumen(?:es)?|conclusiones?|sintesis|cierre|resultados?)\b", re.IGNORECASE), "summary"),
    (re.compile(r"\b(ejemplos?|casos?|ejercicios?)\b", re.IGNORECASE), "example"),
    (re.compile(r"\b(preguntas?|quiz|evaluacion(?:es)?|cuestionarios?|items?|reactivos?)\b", re.IGNORECASE), "question"),
    (re.compile(r"\b(vinetas?|paneles?|panel|cuadros?|tiras?)\b", re.IGNORECASE), "panel"),
    (re.compile(r"\b(parrafos?|textos?|introduccion|intro|explicacion(?:es)?)\b", re.IGNORECASE), "paragraph"),
    (re.compile(r"\b(encabezados?|titulos?|header|cabecera)\b", re.IGNORECASE), "header"),
    (re.compile(r"\b(pasos?|guia|etapas?)\b", re.IGNORECASE), "steps"),
    (re.compile(r"\b(tarjetas?|cards?)\b", re.IGNORECASE), "card"),
    (re.compile(r"\b(revelacion(?:es)?|respuestas?|desplegables?|reveal)\b", re.IGNORECASE), "reveal"),
    (re.compile(r"\b(videos?)\b", re.IGNORECASE), "video"),
    (re.compile(r"\b(tablas?|cuadros?\s+comparativos?)\b", re.IGNORECASE), "tabla"),
    (re.compile(r"\b(imagenes?|fotos?|ilustracion(?:es)?)\b", re.IGNORECASE), "imagen"),
)

_TYPE_LEVENSHTEIN_TARGETS: tuple[tuple[str, str], ...] = (
    ("pregunta", "question"),
    ("resumen", "summary"),
    ("ejemplo", "example"),
    ("vineta", "panel"),
    ("parrafo", "paragraph"),
    ("objetivo", "objective"),
)

_ORDINAL_WORDS: tuple[tuple[re.Pattern[str], int], ...] = (
    (re.compile(r"\b(?:primero|primera|1(?:er|ro|ra))\b", re.IGNORECASE), 1),
    (re.compile(r"\b(?:segundo|segunda|2(?:do|da))\b", re.IGNORECASE), 2),
    (re.compile(r"\b(?:tercero|tercera|3(?:er|ro|ra))\b", re.IGNORECASE), 3),
    (re.compile(r"\b(?:cuarto|cuarta|4(?:to|ta))\b", re.IGNORECASE), 4),
    (re.compile(r"\b(?:quinto|quinta|5(?:to|ta))\b", re.IGNORECASE), 5),
    (re.compile(r"\b(?:sexto|sexta|6(?:to|ta))\b", re.IGNORECASE), 6),
    (re.compile(r"\b(?:septimo|septima|7(?:mo|ma))\b", re.IGNORECASE), 7),
    (re.compile(r"\b(?:octavo|octava|8(?:vo|va))\b", re.IGNORECASE), 8),
    (re.compile(r"\b(?:noveno|novena|9(?:no|na))\b", re.IGNORECASE), 9),
    (re.compile(r"\b(?:decimo|decima|10(?:mo|ma))\b", re.IGNORECASE), 10),
)


def split_object_and_destination(instruction: str) -> tuple[str, str | None]:
    """Separa la instrucción en [objeto] y [destino]."""
    norm = normalize_text(instruction)
    match = _MARKER_REGEX.search(norm)
    if not match:
        return norm, None

    idx = match.start()
    obj = norm[:idx].strip()
    dest = norm[idx:].strip()
    return (obj if obj else norm), (dest if dest else None)


def _check_action_patterns(norm: str) -> str | None:
    if re.search(
        r"\b(ya\s+no\s+va|chao\s+con|chau\s+con|fuera(?:\s+con)?|ya\s+no\s+lo\s+necesito|"
        r"ya\s+no\s+me\s+gusta|ya\s+no\s+quiero|ya\s+no\s+sirve|chancal[oa]|chanca)\b",
        norm,
        re.IGNORECASE,
    ):
        return "quitar"

    if (
        re.search(
            r"\b(?:pon|ponle|ponme|coloca)(?:\s+(?:le|me|lo|la))?\s+(?:un|una)\s+(?:objetivo|resumen|conclusion|sintesis|meta)\b",
            norm,
            re.IGNORECASE,
        )
        or re.search(
            r"\b(?:necesito|quiero)\s+(?:un|una|otro|otra)\s+(?:bloque\s+de\s+)?(?:objetivo|resumen|conclusion|sintesis|meta)\b",
            norm,
            re.IGNORECASE,
        )
    ):
        return "anadir"

    if re.search(
        r"\b(quita|quitar|quitar?l[oa]s?|borra|borrar|borrar?l[oa]s?|elimina|eliminar|eliminar?l[oa]s?|"
        r"saca|sacar|sacar?l[oa]s?|suprime|suprimir|suprimir?l[oa]s?|remueve|remover|remover?l[oa]s?|"
        r"destruye|destruir|tachar|elmina|elemina|borar|quitta|chancal[oa]s?|chanca)\b",
        norm,
        re.IGNORECASE,
    ):
        return "quitar"

    if (
        re.search(
            r"\b(mueve|mover|mover?l[oa]s?|muevel[oa]s?|pon|poner|poner?l[oa]s?|ponl[oa]s?|ponle|ponme|"
            r"coloca|colocar|colocar?l[oa]s?|colocal[oa]s?|sube|subir|subir?l[oa]s?|subel[oa]s?|baja|bajar|"
            r"bajar?l[oa]s?|bajal[oa]s?|pasa|pasar|pasar?l[oa]s?|pasal[oa]s?|traslada|trasladar|desplaza|"
            r"desplazar|reordena|reordenar|envia|enviar|manda|mandar|mandar?l[oa]s?|mandal[oa]s?|mandela|"
            r"ubica|ubicar|posiciona|posicionar|cooca|moever|tiene\s+que\s+ir|debe\s+ir)\b",
            norm,
            re.IGNORECASE,
        )
        or re.search(r"\bva(?:n)?\s+(?:antes|despues|al|arriba|abajo)\b", norm, re.IGNORECASE)
    ):
        return "mover"

    if re.search(
        r"\b(anade|anadir|agrega|agregar|incluye|incluir|inserta|insertar|crea|crear|suma|sumar|"
        r"incorpora|incorporar|agega|agerga|inclui)\b",
        norm,
        re.IGNORECASE,
    ):
        return "anadir"

    if re.search(r"\b(reemplaza|reemplazar|sustituye|sustituir|cambia|cambiar|modifica|modificar)\b", norm, re.IGNORECASE):
        return "reemplazar"
    return None


def extract_deterministic_action(text: str) -> str | None:
    """Extrae la acción determinista de un texto con soporte para sinónimos y Levenshtein."""
    norm = normalize_text(text)
    action = _check_action_patterns(norm)
    if action:
        return action

    for token in norm.split():
        if len(token) >= 4:
            if min(levenshtein(token, "quitar"), levenshtein(token, "borrar"), levenshtein(token, "elimina")) <= 1:
                return "quitar"
            if min(levenshtein(token, "mover"), levenshtein(token, "colocar")) <= 1:
                return "mover"
            if min(levenshtein(token, "anadir"), levenshtein(token, "agregar"), levenshtein(token, "insertar")) <= 1:
                return "anadir"
    return None


def extract_deterministic_type(text: str) -> str | None:
    """Extrae el tipo de bloque pedagógico con sinónimos y tolerancia tipográfica."""
    norm = normalize_text(text)
    for pattern, type_val in _TYPE_PATTERNS:
        if pattern.search(norm):
            return type_val

    for t in norm.split():
        if len(t) >= 5:
            for target_word, type_val in _TYPE_LEVENSHTEIN_TARGETS:
                if levenshtein(t, target_word) <= 1:
                    return type_val
    return None


def _extract_ordinal_from_adjacent(norm: str) -> int | str | None:
    type_num = re.search(
        r"(?:pregunta|item|reactivo|vineta|panel|cuadro|parrafo|ejemplo|caso|paso|bloque|tarjeta)\s+"
        r"(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b",
        norm,
        re.IGNORECASE,
    )
    if type_num:
        val = parse_ordinal_value(type_num.group(1))
        if val is not None:
            return val

    ord_type = re.search(
        r"\b(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|septim[oa]|octav[oa]|noven[oa]|"
        r"decim[oa]|penultim[oa]|antepenultim[oa]|ultim[oa])\s+(?:pregunta|item|reactivo|vineta|panel|cuadro|"
        r"parrafo|ejemplo|caso|paso|bloque|tarjeta)",
        norm,
        re.IGNORECASE,
    )
    if ord_type:
        val = parse_ordinal_value(ord_type.group(1))
        if val is not None:
            return val

    explicit = re.search(
        r"\b(?:numero|num|n°|nro)\s*(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b",
        norm,
        re.IGNORECASE,
    )
    if explicit:
        return parse_ordinal_value(explicit.group(1))
    return None


def _extract_ordinal_from_article(norm: str) -> int | str | None:
    article_match = re.search(
        r"\b(?:la|el)\s+(\d+|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b"
        r"(?!\s+(?:niveles|capas|fases|pasos|columnas|filas|elementos|segundos|minutos|horas|puntos|"
        r"preguntas|ejemplos|items|bloques))",
        norm,
        re.IGNORECASE,
    )
    if article_match:
        idx = article_match.start()
        prefix = norm[max(0, idx - 5):idx].strip()
        if not re.search(r"\b(?:en|con|sobre)\b", prefix, re.IGNORECASE):
            return parse_ordinal_value(article_match.group(1))
    return None


def _extract_positional_ordinal(norm: str) -> int | str | None:
    if re.search(r"\b(?:la|el)\s+de\s+arriba\b", norm, re.IGNORECASE):
        return 1
    if re.search(r"\b(?:la|el)\s+de\s+abajo\b", norm, re.IGNORECASE):
        return "ultimo"
    if re.search(r"\b(?:introduccion|intro)\b", norm, re.IGNORECASE):
        return 1
    if re.search(r"\b(?:antepenultim[oa]|antepenultima)\b", norm, re.IGNORECASE):
        return "antepenultimo"
    if re.search(r"\b(?:penultim[oa]|penultima)\b", norm, re.IGNORECASE):
        return "penultimo"
    if re.search(r"\b(?:ultim[oa]s?|ultima|final)\b", norm, re.IGNORECASE):
        return "ultimo"
    return None


def extract_deterministic_ordinal(object_text: str) -> int | str | None:
    """A.1: Extracción de ordinales determinista, desambiguando de números en contenido."""
    norm = normalize_text(object_text)

    pos = _extract_positional_ordinal(norm)
    if pos is not None:
        return pos

    adj = _extract_ordinal_from_adjacent(norm)
    if adj is not None:
        return adj

    art = _extract_ordinal_from_article(norm)
    if art is not None:
        return art

    for pattern, num in _ORDINAL_WORDS:
        if pattern.search(norm):
            return num

    return None


def _resolve_relative_ref(
    rem: str,
    blocks: list[ResourceBlock],
    object_type: str | None,
    pos: str,
) -> tuple[IntentDestino | None, bool]:
    from editor.domain.reducer import find_block_by_content_or_title, format_block_description

    ref_type = extract_deterministic_type(rem)
    ref_ord = extract_deterministic_ordinal(rem)
    if ref_type:
        return IntentDestino(
            posicion=pos,
            referencia=IntentDestinoRef(tipo=normalize_type(ref_type), indice=ref_ord),
        ), False
    if ref_ord is not None and object_type:
        return IntentDestino(
            posicion=pos,
            referencia=IntentDestinoRef(tipo=object_type, indice=ref_ord),
        ), False
    cm = find_block_by_content_or_title(blocks, rem)
    if cm:
        return IntentDestino(
            posicion=pos,
            referencia=IntentDestinoRef(
                id=cm["block"].id,
                tipo=normalize_type(cm["block"].tipo),
                descripcion=format_block_description(cm["block"]),
            ),
        ), True
    return None, False


def extract_deterministic_destination(
    destination_text: str | None,
    blocks: list[ResourceBlock],
    object_type: str | None = None,
) -> tuple[IntentDestino | None, bool]:
    """A.2: Destinos relativos y absolutos con resolución por tipo o contenido/título."""
    if not destination_text:
        return None, False

    norm = normalize_text(destination_text)

    m_despues = re.search(r"\b(?:despues\s+de(?:l)?|tras|debajo\s+de(?:l)?|debajo)\s+(.*)", norm, re.IGNORECASE)
    if m_despues:
        return _resolve_relative_ref(m_despues.group(1).strip(), blocks, object_type, "despues")

    m_antes = re.search(r"\b(?:antes\s+de(?:l)?|previo\s+a|encima\s+de(?:l)?|encima)\s+(.*)", norm, re.IGNORECASE)
    if m_antes:
        return _resolve_relative_ref(m_antes.group(1).strip(), blocks, object_type, "antes")

    if re.search(
        r"\b(?:hasta\s+)?(?:al|el)?\s*(?:inicio|principio|comienzo)\b|\b(?:arriba(?:\s+del\s+todo)?|sube|de\s+primer[oa]|en\s+primer\s+lugar)\b",
        norm,
        re.IGNORECASE,
    ):
        return IntentDestino(posicion="inicio"), False

    if re.search(
        r"\b(?:hasta\s+)?(?:al|el)?\s*final(?:\s+de\s+todo)?\b|\b(?:al\s+cierre|abajo|al\s+fondo|baja)\b",
        norm,
        re.IGNORECASE,
    ):
        return IntentDestino(posicion="final"), False

    return None, False
