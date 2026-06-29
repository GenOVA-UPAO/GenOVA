"""Load + render the externalized 5E prompt templates from ``data/<phase>.toml``.

Each phase file holds the prompt body of every resource as an editable
multiline string with ``${placeholder}`` substitutions, so prompts can be tuned
without touching Python. The ``*_prompts.py`` modules are thin consumers of the
render helpers here.

Placeholders: ``${concept}`` ``${curso}`` ``${scorm}`` ``${ds}`` ``${data_json}``
``${estilo}`` plus per-resource ``${num_*}`` knobs (with ``_plus1`` / ``_plus2``
derived variants). Defaults live in each resource's ``defaults`` table and are
overridden by the caller's ``config``.
"""

import tomllib
from functools import cache
from pathlib import Path
from string import Template

from llm.utils.utils import CURSO_CONTEXTO, DESIGN_SYSTEM, SCORM_JS

_DATA_DIR = Path(__file__).parent / "data"


@cache
def _phase(name: str) -> dict:
    with open(_DATA_DIR / f"{name}.toml", "rb") as f:
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


def render_texto(phase: str, n: int, concept: str, config: dict | None = None) -> str:
    entry = _phase(phase).get("texto", {}).get(str(n))
    if not entry:
        return ""
    return Template(entry["template"]).substitute(
        concept=concept, curso=CURSO_CONTEXTO, scorm=SCORM_JS, **_params(entry, config)
    )


def render_codigo(
    phase: str, n: int, concept: str, design_system: str | None = None, config: dict | None = None
) -> str:
    entry = _phase(phase).get("codigo", {}).get(str(n))
    if not entry:
        return ""
    return Template(entry["template"]).substitute(
        concept=concept,
        curso=CURSO_CONTEXTO,
        scorm=SCORM_JS,
        ds=design_system or DESIGN_SYSTEM,
        **_params(entry, config),
    )


def render_simulador(
    phase: str, concept: str, design_system: str | None = None, config: dict | None = None
) -> str:
    entry = _phase(phase)["simulador"]
    return Template(entry["template"]).substitute(
        concept=concept,
        curso=CURSO_CONTEXTO,
        scorm=SCORM_JS,
        ds=design_system or DESIGN_SYSTEM,
        **_params(entry, config),
    )


def render_html(
    phase: str, n: int, concept: str, data_json: str, design_system: str | None = None
) -> str:
    html = _phase(phase)["html"]
    estilo = html.get("estilos", {}).get(str(n), html["estilo_default"])
    return Template(html["template"]).substitute(
        concept=concept,
        curso=CURSO_CONTEXTO,
        scorm=SCORM_JS,
        ds=design_system or DESIGN_SYSTEM,
        data_json=data_json,
        estilo=estilo,
    )
