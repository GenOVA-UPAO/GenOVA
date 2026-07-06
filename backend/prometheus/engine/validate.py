"""Validate estructural por recurso (F2.3) — evaluator-optimizer.

Checklist determinístico sobre el HTML generado; si hay defectos, una ronda de
`apply_feedback` (refinador existente) con el reporte exacto y re-chequeo.
Cierra los dos defectos reales de la auditoría 2026-07-06 (#10): Noticia sin
ningún clickable ni _scormComplete(), y Lab de Código esqueleto con placeholder
"Contenido del card".

El conteo exacto de elementos vs resource_config queda como criterio del
contrato del prompt (F4.3); aquí solo entra lo verificable sin ambigüedad.
"""

import logging
import re

logger = logging.getLogger(__name__)

_PLACEHOLDERS = (
    "contenido del card",
    "lorem ipsum",
    "texto de ejemplo aquí",
    "[placeholder]",
    "{{placeholder}}",
)

_INTERACTIVE_MARKERS = (
    "<button",
    "<input",
    "<select",
    "<textarea",
    "addeventlistener",
    "draggable=",
    "onclick",
)

_MIN_HTML_CHARS = 3000  # el recurso legítimo más pequeño (podcast texto) ronda 4KB
_MIN_VISIBLE_CHARS = 250


def _visible_text(html: str) -> str:
    no_script = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", html, flags=re.I)
    return re.sub(r"<[^>]+>", " ", no_script)


def structural_defects(html: str) -> list[str]:
    """Defectos verificables sin LLM. Lista vacía = recurso aceptable."""
    defects: list[str] = []
    low = html.lower()

    if "_scormcomplete(" not in low:
        defects.append(
            "no existe ninguna llamada a _scormComplete() — el alumno no puede "
            "completar el recurso en el LMS; añade el mecanismo de completitud"
        )
    if not any(m in low for m in _INTERACTIVE_MARKERS):
        defects.append(
            "no hay ningún elemento interactivo (button/input/handler) — añade al "
            "menos la interacción mínima que exige el tipo de recurso"
        )
    hit = next((p for p in _PLACEHOLDERS if p in low), None)
    if hit:
        defects.append(
            f'contiene texto placeholder ("{hit}") — reemplázalo por contenido '
            "pedagógico real y específico del concepto"
        )
    if len(html) < _MIN_HTML_CHARS or len(_visible_text(html).split()) * 6 < _MIN_VISIBLE_CHARS:
        defects.append(
            "contenido escaso para un recurso educativo — desarrolla el contenido "
            "pedagógico completo que pide la tarea (sin relleno)"
        )
    return defects


def output_contract() -> str:
    """Contrato de salida para prompts HTML (F4.3) — espejo exacto del checklist
    de structural_defects(); si cambias un check, cambia también su línea aquí."""
    return (
        "[CONTRATO_DE_SALIDA — el sistema VERIFICA esto automáticamente y te hará "
        "corregirlo si falla]\n"
        "1. Existe al menos una llamada real a _scormComplete() alcanzable al "
        "completar la actividad.\n"
        "2. Hay al menos un elemento interactivo funcional (button/input/handler).\n"
        "3. Cero texto placeholder (nada de 'Contenido del card', lorem ipsum ni "
        "similares) — todo contenido es pedagógico, real y específico del concepto.\n"
        "4. El contenido está completamente desarrollado (no esqueleto): cada "
        "sección/pregunta/paso que pide la tarea existe con su contenido.\n"
        "5. Si la tarea especifica un número N de elementos, genera EXACTAMENTE N.\n"
    )


def validate_and_improve(
    html: str,
    phase: str,
    rt,
    concept: str,
    llm_config=None,
    enabled_models=None,
    theme=None,
    max_rounds: int = 2,
) -> tuple[str, list[str]]:
    """Chequea → si hay defectos, hasta max_rounds de feedback dirigido → rechequea.

    Devuelve (html_final, defectos_restantes). Best-effort: nunca lanza; si el
    refinado regresa peor (muy corto), se conserva la versión anterior.
    """
    from prometheus.engine.refine import apply_feedback

    defects = structural_defects(html)
    rounds = 0
    while defects and rounds < max_rounds:
        rounds += 1
        logger.info("validate: %s:%s round %d — %d defecto(s)", phase, rt, rounds, len(defects))
        improved = apply_feedback(
            html, concept, defects, phase, rt, llm_config, enabled_models, theme
        )
        if improved and len(improved) >= len(html) * 0.5:
            html = improved
        defects = structural_defects(html)
    if defects:
        logger.warning("validate: %s:%s aún con defectos tras %d ronda(s): %s",
                       phase, rt, rounds, defects)
    return html, defects
