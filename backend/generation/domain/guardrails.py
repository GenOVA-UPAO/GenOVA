"""Guardrails de entrada: área temática + moderación de lenguaje.

Decisiones de matching (lista de términos)
-----------------------------------------
Se compara por PALABRA COMPLETA sobre texto normalizado (minúsculas, sin tildes),
nunca por subcadena. Si no, "esclavo" bloquearía "esclavitud" en un OVA de
historia, y cualquier lista corta genera falsos positivos absurdos. Un término
de varias palabras ("hijo de puta") se trata como frase con el mismo criterio
de bordes de palabra a ambos lados.

La lista por defecto es el suelo: corta, insultos y sexual explícito; no incluye
términos políticos, médicos ni históricos. Vacía en config → se usa esta lista.

Fail-open / fail-closed (cuando hay modelo)
-------------------------------------------
- Moderación: si el modelo falla o no hay modelo, se usa la lista. Nunca se
  deja pasar un insulto listado por un error de red, y nunca se tumba el
  servicio si el proveedor cae.
- Área temática: es semántica (una lista de palabras no sirve). Si el modelo
  no está disponible o la llamada falla, se PERMITE y se registra un warning.
  Bloquear por un fallo de red dejaría al usuario sin generar. Fail-open
  documentado a propósito: peor un tema raro que un 400 por caída del proveedor.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass

from generation.domain.errors import PromptInappropriateLanguage, PromptOffTopic

GUARDRAIL_KEYS = (
    "guardrail_topic_area",
    "guardrail_topic_enabled",
    "guardrail_moderation_enabled",
    "guardrail_moderation_terms",
    "guardrail_moderation_model",
)
BOOL_KEYS = frozenset({"guardrail_topic_enabled", "guardrail_moderation_enabled"})
VALID_BOOL = frozenset({"0", "1"})

CODE_OFF_TOPIC = "prompt_off_topic"
CODE_LANGUAGE = "prompt_inappropriate_language"

# Insultos y sexual explícito, ES+EN. Sin políticos, médicos ni históricos.
# Se omite "coño": al quitar tildes colisiona con "cono" (geometría).
DEFAULT_TERMS: tuple[str, ...] = (
    "idiota",
    "imbécil",
    "estúpido",
    "cabrón",
    "gilipollas",
    "pendejo",
    "mierda",
    "puta",
    "puto",
    "maricón",
    "hijo de puta",
    "joder",
    "carajo",
    "verga",
    "polla",
    "porno",
    "pornografía",
    "fuck",
    "fucking",
    "shit",
    "asshole",
    "bitch",
    "cunt",
    "motherfucker",
    "porn",
    "slut",
    "whore",
)

_OFF_TOPIC_MSG = (
    "El prompt no pertenece al área temática permitida ({area}). "
    "Elige un tema de esa área."
)
_LANGUAGE_MSG = (
    "El prompt contiene lenguaje inapropiado. "
    "Reformúlalo sin insultos ni contenido sexual explícito."
)

_JSON_OBJECT = re.compile(r"\{.*\}", re.S)


def fold_text(text: str) -> str:
    """Minúsculas y sin tildes/diacríticos (NFD, categoría Mn)."""
    nfd = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def parse_terms(raw: str | Sequence[str] | None) -> tuple[str, ...]:
    """Lista editable del admin: una entrada por línea, recortada, sin vacías ni dupes."""
    if raw is None:
        return ()
    lines = raw.splitlines() if isinstance(raw, str) else [str(item) for item in raw]
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        term = line.strip()
        if not term:
            continue
        key = fold_text(term)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(term)
    return tuple(out)


def effective_terms(raw: str | Sequence[str] | None) -> tuple[str, ...]:
    """Términos configurados, o la lista por defecto si el admin dejó el campo vacío."""
    parsed = parse_terms(raw)
    return parsed if parsed else DEFAULT_TERMS


def find_blocked_term(prompt: str, terms: Sequence[str]) -> str | None:
    """Primer término que coincide por palabra/frase completa, o None."""
    folded_prompt = fold_text(prompt)
    if not folded_prompt.strip():
        return None
    for term in terms:
        needle = fold_text(term).strip()
        if not needle:
            continue
        pattern = r"(?<![a-z0-9])" + re.escape(needle) + r"(?![a-z0-9])"
        if re.search(pattern, folded_prompt):
            return term
    return None


@dataclass(frozen=True, slots=True)
class LlmVerdict:
    """Resultado parseado de la (única) llamada al modelo. None en un eje = no pedido."""

    language_ok: bool | None = None
    topic_ok: bool | None = None


@dataclass(frozen=True, slots=True)
class GuardrailVerdict:
    allowed: bool
    code: str | None = None
    message: str | None = None


def validate_guardrail_updates(payload: dict) -> dict[str, str]:
    """Valida el PUT admin. ValueError con mensaje listo para 400."""
    if not isinstance(payload, dict):
        raise ValueError("Payload vacío o sin claves reconocidas")
    allowed = set(GUARDRAIL_KEYS)
    updates: dict[str, str] = {}
    for key, value in payload.items():
        if key not in allowed:
            continue
        text = "" if value is None else str(value)
        if key in BOOL_KEYS and text not in VALID_BOOL:
            raise ValueError(f"Flag '{key}' debe ser '0' o '1'")
        if key == "guardrail_moderation_model":
            text = text.strip()
            if text and "/" not in text:
                raise ValueError(
                    "guardrail_moderation_model debe ser vacío o '<provider>/<model_id>'"
                )
        updates[key] = text
    if not updates:
        raise ValueError("Payload vacío o sin claves reconocidas")
    return updates


def parse_moderation_model(value: str) -> tuple[str, str] | None:
    """'' | '<provider>/<model_id>' → tupla o None (mismo contrato que el frontend)."""
    raw = (value or "").strip()
    if not raw:
        return None
    slash = raw.find("/")
    if slash <= 0 or slash >= len(raw) - 1:
        return None
    provider, model_id = raw[:slash].strip(), raw[slash + 1 :].strip()
    if not provider or not model_id:
        return None
    return provider, model_id


def _as_ok(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if not isinstance(value, str):
        return None
    token = fold_text(value).strip()
    if token in {"ok", "allow", "allowed", "pass", "yes", "true", "1"}:
        return True
    if token in {"block", "blocked", "deny", "denied", "fail", "no", "false", "0"}:
        return False
    return None


def parse_classifier_response(raw: str) -> LlmVerdict | None:
    """JSON binario {language, topic}. Si no se entiende, None (el caller aplica fallback)."""
    if not raw or not str(raw).strip():
        return None
    text = str(raw).strip()
    blob = text
    match = _JSON_OBJECT.search(text)
    if match:
        blob = match.group(0)
    try:
        data = json.loads(blob)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    language_ok = _as_ok(data.get("language"))
    topic_ok = _as_ok(data.get("topic"))
    if language_ok is None and topic_ok is None:
        return None
    return LlmVerdict(language_ok=language_ok, topic_ok=topic_ok)


def evaluate_input(
    prompt: str,
    *,
    topic_enabled: bool,
    topic_area: str,
    moderation_enabled: bool,
    terms: Sequence[str],
    llm: LlmVerdict | None,
) -> GuardrailVerdict:
    """Decide permitir/bloquear. `llm=None` significa no llamado o llamada fallida.

    Moderación: lista como suelo; el modelo, si respondió, puede bloquear de más.
    Si el modelo no respondió, manda la lista.
    Tema: solo el modelo; si no hay veredicto, se permite (fail-open).
    """
    if moderation_enabled:
        listed = find_blocked_term(prompt, terms)
        if listed is not None:
            return GuardrailVerdict(False, CODE_LANGUAGE, _LANGUAGE_MSG)
        if llm is not None and llm.language_ok is False:
            return GuardrailVerdict(False, CODE_LANGUAGE, _LANGUAGE_MSG)

    area = (topic_area or "").strip()
    if topic_enabled and area and llm is not None and llm.topic_ok is False:
        return GuardrailVerdict(False, CODE_OFF_TOPIC, _OFF_TOPIC_MSG.format(area=area))
    return GuardrailVerdict(True)


def raise_if_blocked(verdict: GuardrailVerdict) -> None:
    if verdict.allowed:
        return
    if verdict.code == CODE_LANGUAGE:
        raise PromptInappropriateLanguage(verdict.message)
    raise PromptOffTopic(verdict.message)
