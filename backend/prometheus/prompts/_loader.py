"""Load + render prompt templates from data/<phase>.toml.

Conserved for podcast script generation (engage:3).
All other 49 resources use deterministic templates in ova_engine/.
"""

import tomllib
from functools import cache
from pathlib import Path
from string import Template

from llm.utils.utils import CURSO_CONTEXTO, SCORM_JS
from ova_engine.domain_context import domain_for

_DATA_DIR = Path(__file__).parent / "data"

_TOPIC_LOCK = (
    "\n\n[ANCLAJE DE TEMA — INQUEBRANTABLE]\n"
    'El ÚNICO tema de este recurso es: "${concept}".\n'
    "El <h1> DEBE nombrar ese tema (o un recorte fiel). PROHIBIDO cambiar de "
    "dominio ni de subtema: no sustituyas el tema por otro ni arrastres ejemplos "
    "de otras disciplinas. "
    "Si dudas, desarrolla ESE concepto; no inventes otro.\n"
)


def _lock(concept: str) -> str:
    return Template(_TOPIC_LOCK).substitute(concept=concept)


@cache
def _phase(name: str) -> dict:
    p = _DATA_DIR / f"{name}.toml"
    if not p.exists():
        return {}
    with open(p, "rb") as f:
        return tomllib.load(f)


def _params(entry: dict, config: dict | None) -> dict:
    """Merge resource defaults with the caller config, exposing ``_plus1`` /
    ``_plus2`` derived variants for every integer knob."""
    merged = {**entry.get("defaults", {}), **(config or {})}
    for key, value in list(merged.items()):
        if isinstance(value, int) and not isinstance(value, bool):
            merged[f"{key}_plus1"] = value + 1
            merged[f"{key}_plus2"] = value + 2
    return merged


def render_texto(
    phase: str, n: int, concept: str, config: dict | None = None, contexto: str = ""
) -> str:
    entry = _phase(phase).get("texto", {}).get(str(n))
    if not entry:
        return ""
    d = domain_for(concept, contexto)
    # El curso de Oracle solo se inyecta en temas de bases de datos; en los demás, el nivel.
    curso = CURSO_CONTEXTO if d.is_db else f"{d.rules()}"
    return Template(entry["template"]).substitute(
        concept=concept,
        curso=curso,
        audiencia=d.audiencia,
        scorm=SCORM_JS,
        **_params(entry, config),
    ) + _lock(concept)
