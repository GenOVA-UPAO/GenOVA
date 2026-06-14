"""Critic/refiner pass (Fase 3) — one targeted fix for defective resources.

Runs inside each resource's generation (after validate_and_repair), so it stays
within the bounded-parallel batch and adds an LLM call ONLY for resources that
have real defects — never a second sequential pass over the whole OVA.

Signal = the structural failures html_validator still reports after auto-repair,
plus a precise "interactive buttons with no JS handlers" check. The refined HTML
is accepted only if it does not regress (fewer/equal structural issues, not a
truncated stub); otherwise the original is kept.
"""

import logging

from config import settings
from llm.html_validator import validate_html
from llm.router import generar_texto
from llm.themes import build_design_system
from llm.utils import strip_markdown

logger = logging.getLogger(__name__)


def _refine_enabled() -> bool:
    return str(settings.ova_refine).strip().lower() not in ("0", "false", "no")


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


def maybe_refine(
    html: str, phase: str, rt: int, concept: str, llm_config=None, enabled_models=None, theme=None
) -> str:
    """Return refined HTML when the resource has defects and the fix improves it.

    No-op when refinement is disabled (env OVA_REFINE=0), the HTML is empty, or
    no issues are detected — keeping the common (healthy) path cost-free.
    """
    if not _refine_enabled() or not html:
        return html

    issues = _quality_issues(html, phase, rt)
    if not issues:
        return html

    theme = theme or {}
    ds = build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))
    try:
        refined = strip_markdown(
            generar_texto(_refine_prompt(html, concept, issues, ds), "codigo", 12000, llm_config, enabled_models)
        )
    except Exception:  # noqa: BLE001 — refine is best-effort, never fail the resource
        logger.exception("refine failed for %s/%s", phase, rt)
        return html

    # Accept only if it does not regress structurally and isn't a truncated stub.
    before = len(validate_html(html, phase, rt))
    after = len(validate_html(refined, phase, rt))
    if refined and after <= before and len(refined) >= len(html) * 0.6:
        logger.info("refine accepted for %s/%s (%d→%d issues)", phase, rt, before, after)
        return refined
    logger.info("refine rejected for %s/%s (no improvement)", phase, rt)
    return html
