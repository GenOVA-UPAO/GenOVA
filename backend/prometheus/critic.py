"""Pedagógico evaluator — Crítico (EN-015).

Evalúa cada recurso HTML generado con una rúbrica de 4 criterios y devuelve un
veredicto estructurado.  El resultado guía el bucle Generador-Crítico en runtime.py:
si el veredicto es "revisar", runtime re-genera pasando los problemas como feedback.
Usa "texto" (no "codigo") porque la evaluación es análisis semántico, no código HTML.
"""

import json
import logging
import re

from llm.router import generar_texto
from llm.themes import build_design_system

logger = logging.getLogger(__name__)

_FALLBACK = {"puntaje": 0, "problemas": [], "veredicto": "aceptar"}

_PROMPT_TMPL = """\
[ROL] Evaluador pedagógico de recursos educativos HTML5.
[FASE_5E] {phase} | [TIPO_RECURSO] {rt} | [CONCEPTO] "{concept}"
[TAREA] Evalúa este recurso según 4 criterios y responde SOLO con JSON válido:
1. Fidelidad pedagógica: ¿enseña el concepto y cumple el objetivo 5E de la fase?
2. Adecuación tipo/formato: ¿el HTML coincide con el tipo de recurso esperado?
3. Interactividad real: ¿hay handlers JS (addEventListener/onclick) donde se requiere?
4. Correctitud: ¿sin errores conceptuales ni datos inventados?
[RESPUESTA] {{"puntaje": 0-100, "problemas": ["..."], "veredicto": "aceptar"|"revisar"}}
[HTML_EXTRACTO]
{html_excerpt}"""


def _parse_critic_response(response: str) -> dict:
    """Extract JSON from LLM response robustly; fall back to _FALLBACK on any failure."""
    try:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if not match:
            return dict(_FALLBACK)
        data = json.loads(match.group())
        puntaje = int(data.get("puntaje", 0))
        problemas = list(data.get("problemas", []))
        veredicto = str(data.get("veredicto", "aceptar"))
        if veredicto not in ("aceptar", "revisar"):
            veredicto = "aceptar"
        return {"puntaje": max(0, min(100, puntaje)), "problemas": problemas, "veredicto": veredicto}
    except Exception:  # noqa: BLE001
        logger.debug("critic parse failed; falling back to accept")
        return dict(_FALLBACK)


def critique_resource(
    html: str,
    phase: str,
    rt: int,
    concept: str,
    llm_config: dict,
    enabled_models: list,
    theme: dict,
) -> dict:
    """Return {"puntaje": 0-100, "problemas": [str], "veredicto": "aceptar"|"revisar"}.

    On any LLM or parse failure the function returns the fallback (accept, score 0)
    so it never blocks resource delivery (R4).
    """
    theme = theme or {}
    ds = build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))
    prompt = _PROMPT_TMPL.format(
        phase=phase,
        rt=rt,
        concept=concept,
        html_excerpt=html[:2000],
    ) + f"\n[DESIGN_SYSTEM]\n{ds}"

    try:
        response = generar_texto(prompt, "texto", 512, llm_config, enabled_models)
    except Exception:  # noqa: BLE001
        logger.exception("critic LLM call failed for %s/%s", phase, rt)
        return dict(_FALLBACK)

    return _parse_critic_response(response)
