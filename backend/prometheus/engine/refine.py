"""Critic/refiner pass (Fase 3) — one targeted fix for defective resources.

Runs inside each resource's generation (after validate_and_repair), so it stays
within the bounded-parallel batch and adds an LLM call ONLY for resources that
have real defects — never a second sequential pass over the whole OVA.

Signal = the structural failures html_validator still reports after auto-repair,
plus a precise "interactive buttons with no JS handlers" check. The refined HTML
is accepted only if it does not regress (fewer/equal structural issues, not a
truncated stub); otherwise the original is kept.
"""

import structlog

from core.config import settings
from llm.router import generar_texto
from llm.utils.html_validator import validate_html
from llm.utils.llm_helpers import _CODE_MAX_TOKENS
from llm.utils.themes import build_design_system
from llm.utils.utils import strip_markdown

logger = structlog.get_logger(__name__)


def _refine_enabled() -> bool:
    from prometheus.config.nodes_config import get_nodes_config

    nc = get_nodes_config()
    return str(nc.get("ova_refine", settings.ova_refine)).strip().lower() not in (
        "0",
        "false",
        "no",
    )


def _quality_issues(html: str, phase: str, rt: int) -> list[str]:
    issues = list(validate_html(html, phase, rt))
    low = html.lower()
    # Dead interactivity: buttons present but no real handlers (design system
    # forbids inline onclick=, so addEventListener is the expected wiring).
    if "<button" in low and "addeventlistener" not in low and "onclick" not in low:
        issues.append("botones interactivos sin manejadores JS (addEventListener)")
    return issues


def _refine_prompt(html: str, concept: str, issues: list[str], design_system: str) -> str:
    issue_lines = "\n".join(f"- {i}" for i in issues)
    return f"""[ROL] Revisor y refinador de recursos educativos HTML5 interactivos.
[CONCEPTO] "{concept}"
[TAREA] Corrige EXACTAMENTE estos defectos del recurso, conservando todo el
contenido pedagógico válido (no acortes, no inventes lorem):
{issue_lines}
[REGLAS] Arregla estructura (DOCTYPE/cierre de etiquetas), interactividad con
handlers JS reales vía addEventListener, callbacks SCORM, y elimina cualquier
dependencia externa (CDN/fonts/jquery). Mantén o mejora la longitud y la calidad.
{design_system}
[HTML_ACTUAL]
{html}
[SALIDA] Solo el documento HTML completo y corregido desde <!DOCTYPE html>, sin markdown."""


def apply_feedback(
    html: str,
    concept: str,
    feedback: list,
    phase: str,
    rt: int,
    llm_config=None,
    enabled_models=None,
    theme=None,
) -> str:
    """Re-generate HTML incorporating explicit feedback list.

    Best-effort: returns original html on any LLM failure.  Used by the
    Generador-Crítico loop (EN-015) to apply critic feedback without the
    structural regression check — acceptance by puntaje is handled by the caller.
    """
    theme = theme or {}
    ds = build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))
    try:
        return strip_markdown(
            generar_texto(
                _refine_prompt(html, concept, feedback, ds),
                "codigo",
                _CODE_MAX_TOKENS,
                llm_config,
                enabled_models,
            )
        )
    except Exception:  # noqa: BLE001
        logger.exception("apply_feedback failed", phase=phase, resource_type=rt)
        return html


_REFINE_MAX_ROUNDS = 2


def _combined_issues(html: str, phase: str, rt: int) -> list[str]:
    """Señales de refinamiento unificadas para una sola pasada de feedback.

    Une los defectos ESTRUCTURALES (bloquean la completitud del recurso:
    _scormComplete, interactividad, placeholder, contenido escaso) con los de
    CALIDAD (validate_html + botones sin manejadores). Antes las evaluaban por
    separado `validate_and_improve` (estructurales) y `maybe_refine` (calidad),
    encadenando dos refinadores; ahora una ronda cubre todas las señales.
    """
    from prometheus.engine.validate import structural_defects

    return list(structural_defects(html)) + _quality_issues(html, phase, rt)


def _accepts(refined: str, original: str, phase: str, rt: int) -> bool:
    """Acepta el refinado solo si no regresa estructuralmente ni queda truncado."""
    if not refined:
        return False
    before = len(validate_html(original, phase, rt))
    after = len(validate_html(refined, phase, rt))
    return after <= before and len(refined) >= len(original) * 0.6


def refine_and_check(
    html: str,
    phase: str,
    rt: int,
    concept: str,
    llm_config=None,
    enabled_models=None,
    theme=None,
    *,
    max_rounds: int = _REFINE_MAX_ROUNDS,
) -> tuple[str, list[str]]:
    """Compuerta de refinamiento fusionada (reemplaza maybe_refine + validate_and_improve).

    Refina mientras haya defectos (estructurales ∪ calidad), hasta `max_rounds`
    rondas, aceptando solo mejoras que no regresen. Devuelve
    ``(html, defectos_estructurales_restantes)``: los estructurales son la señal
    de routing a repair; los de calidad disparan refinamiento pero NO enrutan
    (misma semántica que antes de la fusión).

    No-op (0 llamadas LLM) cuando el refinamiento está deshabilitado (OVA_REFINE=0),
    el HTML está vacío o no hay defectos — el camino sano no paga refinamiento.
    Un recurso defectuoso hace como máximo `max_rounds` llamadas (antes hasta 3
    entre las dos compuertas encadenadas).
    """
    from prometheus.engine.validate import structural_defects

    if not html:
        return html, []
    if not _refine_enabled():
        return html, structural_defects(html)

    rounds = 0
    while rounds < max_rounds:
        issues = _combined_issues(html, phase, rt)
        if not issues:
            break
        rounds += 1
        refined = apply_feedback(
            html, concept, issues, phase, rt, llm_config, enabled_models, theme
        )
        if not _accepts(refined, html, phase, rt):
            logger.info("refine rejected: no improvement", phase=phase, resource_type=rt)
            break
        logger.info("refine accepted", phase=phase, resource_type=rt, round=rounds)
        html = refined

    return html, structural_defects(html)
