"""Guardrails de entrada del editor visual en capas (determinista y alcance)."""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import UTC, datetime

from editor.domain.model import GuardCheckResult
from generation.domain.guardrails import DEFAULT_TERMS, find_blocked_term, fold_text

MAX_INSTRUCTION_LENGTH = 300

OUT_OF_SCOPE_MESSAGE = (
    "Solo puedo editar la estructura de este recurso: quitar, mover o añadir bloques. "
    "Prueba con: «quita el ejemplo», «sube la pregunta 2», «añade un resumen»"
)

MASS_DELETE_MESSAGE = (
    "No se permite borrar todos los bloques a la vez. "
    "Máximo 1 bloque por instrucción para proteger la integridad del recurso."
)

INAPPROPRIATE_LANGUAGE_MESSAGE = (
    "Mantengamos un lenguaje respetuoso. Solo puedo ayudarte a editar la estructura de este recurso."
)

INAPPROPRIATE_LANGUAGE_REGEXES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:inutil|mierda|carajo|estupido|idiota|imbecil|pendejo|puta|puto|maldito|basura|porqueria)\b", re.IGNORECASE),
    re.compile(r"\beres\s+un\s+(?:inutil|estupido|idiota|imbecil|tonto|perro|fracasado|incompetente)\b", re.IGNORECASE),
)

MANIPULATION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(?:ignora|ignorar|olvida|olvidar)\b.*\binstrucciones\b", re.IGNORECASE),
    re.compile(r"\bignore\b.*\binstructions\b", re.IGNORECASE),
    re.compile(r"\bprompt\s+de\s+sistema\b", re.IGNORECASE),
    re.compile(r"\bsystem\s+prompt\b", re.IGNORECASE),
    re.compile(r"\bc[oó]mo\s+est[aá]s\s+(?:construido|programado|entrenado)\b", re.IGNORECASE),
    re.compile(r"\bhow\s+(?:are\s+you|were\s+you)\s+(?:built|programmed)\b", re.IGNORECASE),
    re.compile(r"\bact[uú]a\s+como\b", re.IGNORECASE),
    re.compile(r"\bact\s+as\b", re.IGNORECASE),
    re.compile(r"\bjailbreak\b", re.IGNORECASE),
    re.compile(r"\b(?:sin\s+restricciones|unrestricted)\b", re.IGNORECASE),
    re.compile(r"\beres\s+un\s+(?:modelo|asistente|bot|ai|llm)\b", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+an?\s+(?:model|assistant|bot|ai|llm)\b", re.IGNORECASE),
    re.compile(r"\b(?:dan|developer\s+mode)\b", re.IGNORECASE),
)

MASS_DELETE_REGEX = re.compile(
    r"\b(?:borra|borrar|elimina|eliminar|quita|quitar|suprime|suprimir|vaciar)\s+"
    r"(?:todo|todos(?:\s+los\s+bloques)?|el\s+recurso(?:\s+completo)?|la\s+fase(?:\s+completa)?)\b",
    re.IGNORECASE,
)

EDIT_VERBS_REGEX = re.compile(
    r"\b(?:quita|quitar|qu[ií]tal[oa]s?|borra|borrar|b[oó]rral[oa]s?|elimina|eliminar|elim[ií]nal[oa]s?|"
    r"saca|sacar|s[aá]cal[oa]s?|suprime|suprimir|remueve|remover|chancal[oa]s?|chanca|mueve|mover|mu[eé]vel[oa]s?|"
    r"pon|poner|p[oó]nl[oa]s?|ponle|ponme|pasa|pasar|p[aá]sal[oa]s?|manda|mandar|m[aá]ndal[oa]s?|mandela|"
    r"sube|subir|s[uú]bel[oa]s?|baja|bajar|b[aá]jal[oa]s?|coloca|colocar|col[oó]cal[oa]s?|ubica|ubicar|"
    r"ub[ií]cal[oa]s?|a[nñ]ade|a[nñ]adir|agrega|agregar|inserta|insertar|incluye|incluir|crea|crear|"
    r"ya\s+no\s+va|chao\s+con|tiene\s+que\s+ir|debe\s+ir|va|van)\b",
    re.IGNORECASE,
)

BLOCK_NOUNS_REGEX = re.compile(
    r"\b(?:panel|vi[nñ]eta|cuadro|pregunta|item|reactivo|quiz|ejemplo|caso|p[aá]rrafo|texto|resumen|conclusi[oó]n|cierre|objetivo|bloque)\b",
    re.IGNORECASE,
)

_rejection_counts: dict[str, int] = {
    "max_length": 0,
    "control_chars": 0,
    "manipulation": 0,
    "borra_todo": 0,
    "fuera_de_alcance": 0,
    "lenguaje_inapropiado": 0,
}


def record_guard_rejection(reason: str) -> None:
    """Registra telemetría de rechazo sin registrar el texto del usuario."""
    _rejection_counts[reason] = _rejection_counts.get(reason, 0) + 1
    payload = {
        "event": "editor_guard_rejection",
        "reason": reason,
        "reasonCount": _rejection_counts[reason],
        "timestamp": datetime.now(UTC).isoformat(),
    }
    # Log estructurado en una sola línea
    print(json.dumps(payload))


def get_guard_telemetry() -> dict[str, int]:
    return dict(_rejection_counts)


def strip_control_characters(text: str) -> str:
    """Elimina caracteres de control conservando saltos de línea y tabulaciones."""
    return "".join(c for c in text if unicodedata.category(c)[0] != "C" or c in "\n\t")


def _clean_greetings(clean: str) -> str:
    greeting_prefix = re.compile(
        r"^(?:(?:hola|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|saludos(?:\s+cordiales)?|que\s+tal)"
        r"(?:,\s*|\s+)*(?:estimad[oa](?:\s+colega|\s+profesor|\s+docente)?|amig[oa]|profesor|docente)?|"
        r"(?:estimad[oa](?:\s+colega|\s+profesor|\s+docente)?))[,\s:]*",
        re.IGNORECASE,
    )
    while greeting_prefix.search(clean):
        clean = greeting_prefix.sub("", clean).strip()
    return clean


def _clean_courtesy_and_justifications(clean: str) -> str:
    clean = re.sub(
        r"^(?:disculpe\s+la\s+molestia|disculpa\s+la\s+molestia|si\s+no\s+es\s+molestia)[,\s]*",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    clean = re.sub(
        r"[,\s]*(?:muchas\s+gracias(?:\s+de\s+antemano)?|gracias(?:\s+de\s+antemano)?|se\s+lo\s+agradecer[ií]a|te\s+lo\s+agradecer[ií]a|saludos)[.!]*$",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    clean = re.sub(
        r"\b(?:podr[ií]as|podr[ií]a|ser[ií]as\s+tan\s+amable\s+de|quisiera\s+pedirte\s+que|te\s+pido\s+que)\s+(?:por\s+favor\s+)?",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    clean = re.sub(r"\bestuve\s+revisando\s+[^,;]+y\s+sentimos\s+que\b", "", clean, flags=re.IGNORECASE)
    clean = re.sub(
        r"\b(?:es\s+muy\s+t[eé]cnic[oa]|est[aá]\s+muy\s+complicad[oa](?:\s+para\s+mis\s+chicos)?|"
        r"ya\s+la\s+vimos\s+en\s+clase|no\s+la\s+voy\s+a\s+evaluar|que\s+ya\s+no\s+sirve)\b",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    return re.sub(r"\b(?:por\s+favor|porfa|plis|please|nom[aá]s|no\s+m[aá]s)\b", " ", clean, flags=re.IGNORECASE)


def _isolate_edit_sentences(clean: str) -> str:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?\n])\s+", clean) if s.strip()]
    if len(sentences) <= 1:
        return clean

    edit_sentences = [s for s in sentences if EDIT_VERBS_REGEX.search(s)]
    if not edit_sentences:
        return clean

    verb_has_block = any(BLOCK_NOUNS_REGEX.search(s) for s in edit_sentences)
    if not verb_has_block:
        sentence_with_block = next((s for s in sentences if BLOCK_NOUNS_REGEX.search(s)), None)
        if sentence_with_block:
            return f"{sentence_with_block} {' '.join(edit_sentences)}"
    return " ".join(edit_sentences)


def extract_core_request(text: str) -> str:
    """Extrae la petición núcleo de mensajes largos o coloquiales con fórmulas de cortesía."""
    if not text or not text.strip():
        return ""

    clean = strip_control_characters(text).strip()
    clean = _clean_greetings(clean)
    clean = _clean_courtesy_and_justifications(clean)
    clean = _isolate_edit_sentences(clean)
    return " ".join(clean.split())


def check_deterministic_guard(raw_text: str, custom_terms: tuple[str, ...] | None = None) -> GuardCheckResult:
    """Capa 1 determinista (0 ms): longitud, caracteres de control, manipulación, borra todo, términos ofensivos."""
    if len(raw_text) > MAX_INSTRUCTION_LENGTH:
        record_guard_rejection("max_length")
        return GuardCheckResult(
            allowed=False,
            reason="max_length",
            motivo=f"La instrucción es demasiado larga (máx. {MAX_INSTRUCTION_LENGTH} caracteres).",
        )

    cleaned = strip_control_characters(raw_text).strip()
    if not cleaned:
        record_guard_rejection("control_chars")
        return GuardCheckResult(
            allowed=False,
            reason="control_chars",
            motivo="La instrucción no contiene texto válido.",
        )

    folded = fold_text(cleaned)

    # Inapropiado / Ofensivo
    for regex in INAPPROPRIATE_LANGUAGE_REGEXES:
        if regex.search(cleaned) or regex.search(folded):
            record_guard_rejection("lenguaje_inapropiado")
            return GuardCheckResult(
                allowed=False,
                reason="lenguaje_inapropiado",
                motivo=INAPPROPRIATE_LANGUAGE_MESSAGE,
            )

    terms = custom_terms if custom_terms else DEFAULT_TERMS
    blocked = find_blocked_term(cleaned, terms)
    if blocked is not None:
        record_guard_rejection("lenguaje_inapropiado")
        return GuardCheckResult(
            allowed=False,
            reason="lenguaje_inapropiado",
            motivo=INAPPROPRIATE_LANGUAGE_MESSAGE,
        )

    # Manipulación / Jailbreak
    for pattern in MANIPULATION_PATTERNS:
        if pattern.search(cleaned) or pattern.search(folded):
            record_guard_rejection("manipulation")
            return GuardCheckResult(
                allowed=False,
                reason="manipulation",
                motivo="La instrucción contiene patrones de manipulación no permitidos.",
            )

    # Borra todo masivo
    if MASS_DELETE_REGEX.search(folded):
        record_guard_rejection("borra_todo")
        return GuardCheckResult(
            allowed=False,
            reason="borra_todo",
            motivo=MASS_DELETE_MESSAGE,
        )

    return GuardCheckResult(allowed=True, cleaned_text=cleaned)
