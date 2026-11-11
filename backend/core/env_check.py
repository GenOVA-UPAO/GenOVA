"""Aviso al arrancar si una credencial del entorno está mal pegada.

Las claves de API y tokens viajan en cabeceras HTTP, que solo admiten ASCII. Una
clave pegada con comillas tipográficas, espacios raros o un salto de línea no
falla al arrancar: falla cada vez que se usa, con un error que no nombra la
variable. Así estuvo SUPABASE_SERVICE_ROLE_KEY en producción: ningún paquete
SCORM llegó a Supabase y todos cayeron al disco efímero, y solo se vio en los
logs de cada subida («'ascii' codec can't encode characters»).

`check_env_credentials()` revisa las variables de credenciales al arrancar y deja
un error por cada una con problemas, con el nombre de la variable y qué tiene mal,
nunca su valor. No impide arrancar: la mayoría son opcionales y el resto de la
aplicación puede seguir funcionando.
"""

from __future__ import annotations

import os
import unicodedata
from collections.abc import Mapping

import structlog

logger = structlog.get_logger(__name__)

# Credenciales que se envían en cabeceras HTTP o forman parte de una URL.
CREDENTIAL_VARS: tuple[str, ...] = (
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GROQ_API_KEY",
    "OPENROUTER_API_KEY",
    "OPENCODE_API_KEY",
    "GEMINI_API_KEY",
    "HF_TOKEN",
    "SILICONFLOW_API_KEY",
    "RUNWARE_API_KEY",
    "FALAI_API_KEY",
    "CF_AI_API_KEY",
    "PEXELS_API_KEY",
    "UNSPLASH_ACCESS_KEY",
    "LAYA_API_KEY",
    "SENTRY_DSN",
    "LOGFIRE_TOKEN",
    "LANGSMITH_API_KEY",
    "METRICS_TOKEN",
)

_QUOTES = "\"'`‘’“”«»"
_MAX_CHARS_LISTED = 3


def _char_label(ch: str) -> str:
    name = unicodedata.name(ch, f"U+{ord(ch):04X}")
    return f"{name} (U+{ord(ch):04X})"


def credential_problems(value: str) -> list[str]:
    """Problemas de formato de una credencial. Nunca incluye el valor ni trozos de él."""
    problems: list[str] = []
    if value != value.strip():
        problems.append("tiene espacios o saltos de línea al principio o al final")
    inner = value.strip()
    if len(inner) >= 2 and inner[0] in _QUOTES and inner[-1] in _QUOTES:
        problems.append("está entre comillas: pega solo la clave, sin comillas")
    non_ascii = [(i, ch) for i, ch in enumerate(value) if ord(ch) > 127]
    if non_ascii:
        kinds = []
        for _, ch in non_ascii:
            label = _char_label(ch)
            if label not in kinds:
                kinds.append(label)
        listed = ", ".join(kinds[:_MAX_CHARS_LISTED])
        if len(kinds) > _MAX_CHARS_LISTED:
            listed += ", …"
        positions = f"{non_ascii[0][0]}–{non_ascii[-1][0]}"
        problems.append(
            f"tiene {len(non_ascii)} caracteres no ASCII (posiciones {positions}): {listed}"
        )
    if any(ch.isspace() for ch in inner):
        problems.append("tiene espacios o saltos de línea en medio")
    return problems


def check_env_credentials(environ: Mapping[str, str] | None = None) -> dict[str, list[str]]:
    """Revisa las credenciales del entorno y registra un error por cada una inválida.

    Devuelve {variable: problemas} solo con las que tienen alguno.
    """
    env = os.environ if environ is None else environ
    found: dict[str, list[str]] = {}
    for var in CREDENTIAL_VARS:
        value = env.get(var) or ""
        if not value:
            continue
        problems = credential_problems(value)
        if problems:
            found[var] = problems
            logger.error(
                "credencial mal pegada en el entorno: vuelve a copiarla y pégala sin formato",
                variable=var,
                problems=problems,
                length=len(value),
            )
    return found
