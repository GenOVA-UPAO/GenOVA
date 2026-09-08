"""Regeneración / edición de recursos de fase para el chat "Aplicar".

Dos modos:

* **Regenerar** (`instruction` vacío): recrea el recurso desde cero con el
  pipeline unificado (`regenerate_phase_content`). Se usa en "Regenerar OVA
  completo" y cuando no hay un cambio concreto que pedir.
* **Editar** (`instruction` presente): parte del HTML actual y aplica SOLO el
  cambio pedido por el usuario, conservando tema, título, enfoque y longitud.
  Se usa cuando en el chat hay un recurso seleccionado y un mensaje de cambio
  ("arregla los botones", "sube el contraste"…). Mismo criterio anti-regresión
  que el refinador: si el resultado se trunca o encoge demasiado, se descarta.
"""

import os
from concurrent.futures import ThreadPoolExecutor

import structlog

from generation.regen.regen_agents import resolve_resource_type
from generation.regen.regen_pipelines import regenerate_phase_content
from llm.router import generar_texto
from llm.utils.llm_helpers import _CODE_MAX_TOKENS
from llm.utils.utils import strip_markdown

logger = structlog.get_logger(__name__)

_EDIT_PROMPT = """[ROL] Editor de recursos educativos HTML5 interactivos.
[TEMA DEL RECURSO] "{concept}"
[TAREA] Aplica EXCLUSIVAMENTE este cambio pedido por el usuario sobre el recurso
actual. No lo regeneres desde cero: parte del HTML de abajo y edítalo.
[CAMBIO PEDIDO]
{instruction}
[REGLAS]
- Conserva el mismo tema, el mismo título (<h1>/<h2>), el enfoque pedagógico y
  una longitud igual o mayor. No cambies nada que el cambio pedido no toque.
- Mantén DOCTYPE, cierre correcto de etiquetas, interactividad con handlers JS
  reales (addEventListener), callbacks SCORM y CERO dependencias externas
  (CDN, fonts, jquery).
[HTML_ACTUAL]
{html}
[SALIDA] Solo el documento HTML completo y editado desde <!DOCTYPE html>, sin markdown."""


def _looks_truncated(html: str) -> bool:
    return not html.rstrip().lower().endswith("</html>")


def edit_phase_content(
    concept: str,
    instruction: str,
    base_html: str,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
) -> str | None:
    """HTML editado con el cambio pedido, o None si falla o regresiona."""
    instruction = (instruction or "").strip()
    if not instruction or not base_html:
        return None
    try:
        new_html = strip_markdown(
            generar_texto(
                _EDIT_PROMPT.format(concept=concept, instruction=instruction, html=base_html),
                "codigo",
                _CODE_MAX_TOKENS,
                llm_config,
                enabled_models,
            )
        )
    except Exception:
        logger.exception("edit_phase_content failed", concept=concept[:60])
        return None
    if not new_html or _looks_truncated(new_html):
        logger.warning("edit produced truncated html; keeping original")
        return None
    if len(new_html) < len(base_html) * 0.6:
        logger.warning("edit shrank resource too much; keeping original")
        return None
    return new_html


def _regen_concurrency() -> int:
    try:
        return max(1, int(os.getenv("OVA_GEN_CONCURRENCY", "4")))
    except ValueError:
        return 4


def _regen_one_phase(
    phase,
    concept: str,
    instruction: str | None,
    llm_config: dict | None,
    enabled_models: list | None,
    image_settings: dict | None,
) -> str | None:
    """Edita (si hay `instruction`) o regenera desde cero un recurso de fase."""
    if instruction:
        return edit_phase_content(
            concept, instruction, phase.content or "", llm_config, enabled_models
        )
    rtype = resolve_resource_type(phase)
    if rtype is None:
        logger.warning("skipping regen — unknown resource_type", phase_id=phase.id)
        return None
    logger.info(
        "regenerating phase", phase_type=phase.phase_type, resource_type=rtype, concept=concept[:60]
    )
    return regenerate_phase_content(
        phase.phase_type, rtype, concept, llm_config, enabled_models, image_settings
    )


def regen_phases_parallel(
    phases: list,
    concept: str,
    instruction: str | None,
    llm_config: dict | None,
    enabled_models: list | None = None,
    image_settings: dict | None = None,
) -> dict[str, str | None]:
    """Edita/regenera `phases` en paralelo → {phase_id: html|None}.

    Cada tarea es una llamada LLM aislada (sin DB); el fallo de una fase da None
    para esa fase sin abortar el resto. El caller escribe las filas.
    """
    if not phases:
        return {}
    workers = min(_regen_concurrency(), len(phases))

    def _one(phase) -> tuple[str, str | None]:
        try:
            return str(phase.id), _regen_one_phase(
                phase, concept, instruction, llm_config, enabled_models, image_settings
            )
        except Exception:
            logger.exception("regen failed for phase", phase_id=phase.id)
            return str(phase.id), None

    with ThreadPoolExecutor(max_workers=workers) as pool:
        return dict(pool.map(_one, phases))
