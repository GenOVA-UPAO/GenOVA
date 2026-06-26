"""Redacción de PII/secretos en logs — red de seguridad para la regla dura R8
(never log passwords, tokens, API keys, ni PII).

`RedactingFilter` enmascara correos y cadenas con pinta de secreto (Bearer, JWT,
claves con prefijo conocido) en el mensaje ya formateado, por si algún módulo
registra datos sensibles por accidente. Deliberadamente NO toca UUIDs ni ids de
job (útiles para depurar): solo patrones inequívocamente sensibles.
"""

import logging
import re

_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[email]"),
    (re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._\-]+"), "Bearer [redacted]"),
    (re.compile(r"\beyJ[A-Za-z0-9._\-]{10,}"), "[jwt]"),
    (re.compile(r"\b(?:sk-or|sk|gsk|hf|fal)[-_][A-Za-z0-9_\-]{12,}"), "[key]"),
)


def redact(text: str) -> str:
    for pattern, repl in _PATTERNS:
        text = pattern.sub(repl, text)
    return text


class RedactingFilter(logging.Filter):
    """Aplica `redact` al mensaje final de cada registro de log."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            message = record.getMessage()
            redacted = redact(message)
            if redacted != message:
                record.msg = redacted
                record.args = ()
        except Exception:  # noqa: S110 — el logging nunca debe romper el flujo
            pass
        return True
