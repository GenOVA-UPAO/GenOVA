"""Datos de ejemplo (`spec.sample`) neutros: el modo fake no filtra Oracle a otros temas.

Los `sample()` de las plantillas nacieron para un curso de Oracle y mencionan SGA,
tablespaces, redo log, ORA-… Sirven para ver el diseño en modo fake (`LLM_FAKE=1`), pero
si el OVA es de otro tema (o de BD genérica) esos términos no deben aparecer. Esta capa
reescribe las cadenas del ejemplo con equivalentes neutros de SQL estándar SOLO cuando
ni el tema, ni el pedido, ni el área temática nombran Oracle (`DomainContext.is_oracle`).

Los `sample()` en sí no se tocan (los tests y las capturas de referencia los usan tal
cual, con sus fixtures aparte). Ningún camino de producción cae a `sample()`: solo lo
usan el modo fake, los scripts de render y los tests.
"""

from __future__ import annotations

import re
from typing import Any

from ova_engine.domain_context import domain_for, is_oracle_text

# Orden importa: lo más largo/específico primero. (patrón, reemplazo en minúscula).
_RULES: tuple[tuple[re.Pattern[str], str], ...] = tuple(
    (re.compile(p, re.IGNORECASE), r)
    for p, r in (
        (r"error ora-\d+", "error del motor"),
        (r"ora-0?(\d+)", r"ERR-\1"),
        (r"base de datos oracle", "base de datos relacional"),
        (r"oracle database", "el SGBD"),
        (r"\boracle\b", "el SGBD"),
        (r"pl/?sql", "SQL procedural"),
        (r"buffer cache de (?:la )?sga", "caché de datos"),
        (r"redo log buffer", "búfer del registro de transacciones"),
        (r"redo logs", "registros de transacciones"),
        (r"redo log", "registro de transacciones"),
        (r"buffer cache", "caché de datos"),
        (r"\bsga\b", "memoria del servidor"),
        (r"\bpga\b", "memoria de sesión"),
        (r"tablespaces", "espacios de almacenamiento"),
        (r"tablespace", "espacio de almacenamiento"),
        (r"\brman\b", "la herramienta de respaldo"),
        (r"data ?guard", "la réplica de respaldo"),
        (r"v\$\w+", "vista_del_sistema"),
        (r"dbms_\w+", "paquete_del_sistema"),
        (r"\bdba_tablespaces\b", "vista_de_almacenamiento"),
        (r"\blgwr\b", "el escritor del registro"),
        (r"\bdbwn\b", "el escritor de datos"),
        (r"\bsmon\b", "el proceso de recuperación"),
    )
)

_SKIP_ID = re.compile(r"^[a-z0-9_-]{1,16}$")


def _swap(match: re.Match[str], repl: str) -> str:
    out = match.expand(repl)
    first = match.group(0)[:1]
    if first.isupper() and out[:1].islower():
        return out[:1].upper() + out[1:]
    return out


def neutralize_text(text: str) -> str:
    """Sustituye los términos propios de Oracle por equivalentes de SQL estándar."""
    if not is_oracle_text(text) and not re.search(r"lgwr|dbwn|smon|dba_tablespaces", text, re.IGNORECASE):
        return text
    if _SKIP_ID.match(text):  # identificadores cortos («pga», «cat_b»): se mantienen
        return text
    for pattern, repl in _RULES:
        text = pattern.sub(lambda m, r=repl: _swap(m, r), text)
    return text


def _walk(value: Any) -> Any:
    if isinstance(value, str):
        return neutralize_text(value)
    if isinstance(value, list):
        return [_walk(v) for v in value]
    if isinstance(value, dict):
        return {k: _walk(v) for k, v in value.items()}
    return value


def neutral_sample(spec, concept: str, params: dict) -> dict:
    """`spec.sample(concept, params)` sin Oracle salvo que el tema/pedido/área lo nombren."""
    data = spec.sample(concept, params)
    if domain_for(concept).is_oracle:
        return data
    return _walk(data)
