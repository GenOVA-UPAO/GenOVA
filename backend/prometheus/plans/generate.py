"""Módulo profundo de generación de un recurso 5E — entrada única (#2).

Antes "generar un recurso" estaba implementado tres veces y había derivado:
  - batch:                 prometheus/plans/{two_step,direct_code}
  - endpoints HTTP 1-rec.: llm/phases/*_router (más ligero, con retry de JSON, con RAG)
  - regen:                 generation/regen/regen_pipelines (mitad reimplementado)

`generate_resource` unifica el pipeline y es el único punto que ejecutan los tres
caminos (workpool, endpoints HTTP y regen):

    prompt → (texto→JSON con retry) → imágenes → design-system → HTML →
    validate_and_repair → base_css/components (upao) → refinamiento fusionado

Devuelve `ResourceResult(html, defects, raw_json)`: `defects` son los defectos
estructurales restantes (señal de routing a repair en el workpool); `raw_json`
es el JSON intermedio del plan two_step (los endpoints lo exponen).
"""

import json
from typing import NamedTuple

import structlog

from llm.router import generar_texto
from llm.utils.llm_helpers import _CODE_MAX_TOKENS
from llm.utils.utils import extract_html_document, parse_json

logger = structlog.get_logger(__name__)

_PROMPTS: dict = {}


def _prompts(phase: str):
    """Módulo de prompts de la fase (late import; cachea el módulo cargado)."""
    if phase in _PROMPTS:
        return _PROMPTS[phase]
    from prometheus.prompts import (
        elaborate_prompts,
        engage_prompts,
        evaluate_prompts,
        explain_prompts,
        explore_prompts,
    )

    mod = {
        "engage": engage_prompts,
        "explore": explore_prompts,
        "explain": explain_prompts,
        "elaborate": elaborate_prompts,
        "evaluate": evaluate_prompts,
    }.get(phase, engage_prompts)
    _PROMPTS[phase] = mod
    return mod


class ResourceResult(NamedTuple):
    html: str
    defects: list[str]  # defectos estructurales restantes → routing a repair
    raw_json: dict | list | None  # JSON intermedio (two_step); None en direct/podcast


def _design_system(theme: dict) -> str:
    from llm.utils.themes import build_design_system

    return build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))


def _parse_json_with_retry(prompt: str, phase: str, rt, llm_config, enabled_models, deadline=None):
    """Step-1 texto→JSON con un reintento estricto (robustez del camino HTTP).

    thinking=False explícito: el JSON son DATOS, no razonamiento. Con el
    thinking auto del helper, deepseek gastaba ~40s en este paso y dejaba el
    presupuesto de recurso sin margen para el HTML; sin thinking son ~11s con
    el mismo JSON válido (medido, ver reporte). Explícito en vez de depender
    del umbral numérico _THINK_OFF_MAX, que se rompe si alguien toca
    max_tokens."""
    from prometheus.engine.budget import can_spend

    raw = generar_texto(
        prompt, "texto", 8192, llm_config, enabled_models, deadline=deadline, thinking=False
    )
    try:
        return parse_json(raw)
    except Exception:
        logger.warning("JSON parse failed, retrying strict", phase=phase, resource_type=rt)
        if not can_spend(deadline):
            logger.info(
                "JSON retry skipped: resource budget exhausted", phase=phase, resource_type=rt
            )
            return {"contenido": raw}
        retry = generar_texto(
            prompt + "\n\nIMPORTANTE: Responde SOLO con el JSON puro, sin texto "
            "adicional, sin markdown, sin explicaciones.",
            "texto",
            8192,
            llm_config,
            enabled_models,
            deadline=deadline,
            thinking=False,
        )
        try:
            return parse_json(retry)
        except Exception:
            logger.warning("JSON retry failed, using raw text", phase=phase, resource_type=rt)
            return {"contenido": retry}


def _post_process(
    html, phase, rt, concept, theme, llm_config, enabled_models, refine, deadline=None
):
    """Cola común: validate_and_repair → refinamiento → runtime UPAO → imágenes.

    El refinador trabaja sobre el HTML que escribió el modelo; el runtime
    (hoja base + componentes, ~45 KB) se inyecta después, una sola vez. Antes se
    inyectaba primero y el refinador tenía que reescribirlo entero: más tokens,
    más latencia y JS truncado cuando la salida tocaba el tope.
    """
    from llm.images.image_placeholder import resolve_image_placeholders
    from llm.utils.html_validator import validate_and_repair
    from llm.utils.ova_runtime import inject_runtime, strip_runtime
    from prometheus.engine.validate import resource_defects

    html, _ = validate_and_repair(strip_runtime(html)[0], phase, rt)
    if refine:
        from prometheus.engine.refine import refine_and_check

        html, _ = refine_and_check(
            html, phase, rt, concept, llm_config, enabled_models, theme, deadline=deadline
        )
    html = inject_runtime(
        html,
        css=theme.get("color", "upao") == "upao",
        components=theme.get("design", "upao") == "upao",
    )
    # The refiner can return image markers that were already resolved: always
    # resolve on the final document.
    html = resolve_image_placeholders(html)
    return html, resource_defects(html, concept)


def _gen_podcast(
    phase, rt, concept, contexto, llm_config, enabled_models, deadline=None
) -> ResourceResult:
    from llm.podcast.podcast import build_podcast_html, podcast_audio_b64

    mono = generar_texto(
        _prompts(phase).prompt_texto(rt, concept, contexto),
        "texto",
        700,
        llm_config,
        enabled_models,
        deadline=deadline,
    )
    audio_b64 = podcast_audio_b64(mono)
    # El player se ensambla de plantilla fija (sin design-system ni refinamiento).
    return ResourceResult(build_podcast_html(concept, mono, audio_b64), [], {"monologue": mono})


def _gen_direct_code(
    phase,
    rt,
    concept,
    contexto,
    theme,
    resource_config,
    llm_config,
    enabled_models,
    refine,
    deadline=None,
) -> ResourceResult:
    html = extract_html_document(
        generar_texto(
            _prompts(phase).prompt_codigo(
                rt, concept, contexto, _design_system(theme), resource_config or {}
            ),
            "codigo",
            _CODE_MAX_TOKENS,
            llm_config,
            enabled_models,
            deadline=deadline,
        )
    )
    html, defects = _post_process(
        html, phase, rt, concept, theme, llm_config, enabled_models, refine, deadline
    )
    return ResourceResult(html, defects, None)


def _gen_two_step(
    phase,
    rt,
    concept,
    contexto,
    theme,
    image_settings,
    resource_config,
    llm_config,
    enabled_models,
    refine,
    deadline=None,
) -> ResourceResult:
    mod = _prompts(phase)
    json_data = _parse_json_with_retry(
        mod.prompt_texto(rt, concept, contexto, resource_config or {}),
        phase,
        rt,
        llm_config,
        enabled_models,
        deadline,
    )

    # Enriquecimiento con imágenes — solo engage tiene campos prompt_imagen.
    # enrich_with_images MUTA json_data (añade image_placeholder) y exige una lista.
    img_replacements: dict[str, str] = {}
    if phase == "engage" and image_settings:
        from prometheus.engine.budget import can_spend

        if can_spend(deadline):
            from llm.images.image_enrich import enrich_with_images

            img_replacements = enrich_with_images(
                json_data if isinstance(json_data, list) else [json_data], image_settings
            )

    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    html = extract_html_document(
        generar_texto(
            mod.prompt_html(rt, concept, json_str, contexto, _design_system(theme)),
            "codigo",
            _CODE_MAX_TOKENS,
            llm_config,
            enabled_models,
            deadline=deadline,
        )
    )

    if img_replacements:
        from llm.images.image_placeholder import resolve_image_placeholders

        html = resolve_image_placeholders(html, img_replacements)

    html, defects = _post_process(
        html, phase, rt, concept, theme, llm_config, enabled_models, refine, deadline
    )
    return ResourceResult(html, defects, json_data)


def generate_resource(
    phase: str,
    rt: int,
    concept: str,
    *,
    plan: str | None = None,
    llm_config=None,
    enabled_models=None,
    theme: dict | None = None,
    image_settings: dict | None = None,
    resource_config: dict | None = None,
    contexto: str = "",
    refine: bool = True,
    deadline: float | None = None,
) -> ResourceResult:
    """Genera UN recurso 5E con el pipeline completo. `plan` por defecto = plan
    canónico de `plan_map.plan_for`. `contexto` = RAG (los endpoints HTTP lo pasan;
    batch/regen usan ""). `deadline` (monotonic) acota refine; si falta, se
    abre un presupuesto de reloj propio (HTTP/regen)."""
    import time

    from core.config import settings
    from prometheus.engine.budget import deadline_at
    from prometheus.plans.plan_map import DIRECT_CODE, PODCAST, plan_for

    n = int(rt)
    if settings.llm_fake:
        from prometheus.engine.fake_invoke import fake_standalone_html

        return ResourceResult(fake_standalone_html(concept, phase, n), [], {"contenido": concept})
    theme = theme or {}
    plan = plan or plan_for(phase, n)
    if deadline is None:
        deadline = deadline_at(time.monotonic())

    if plan == PODCAST:
        return _gen_podcast(phase, n, concept, contexto, llm_config, enabled_models, deadline)
    if plan == DIRECT_CODE:
        return _gen_direct_code(
            phase,
            n,
            concept,
            contexto,
            theme,
            resource_config,
            llm_config,
            enabled_models,
            refine,
            deadline,
        )
    return _gen_two_step(
        phase,
        n,
        concept,
        contexto,
        theme,
        image_settings,
        resource_config,
        llm_config,
        enabled_models,
        refine,
        deadline,
    )
