"""Two-step generation plan: text/JSON → HTML.

Phase-agnostic. Dispatch to the correct prompt module based on `phase`.
"""

import json

from llm.router import generar_texto
from llm.utils.utils import parse_json, strip_markdown

_PROMPTS = {}


def _load_prompts(phase: str):
    if phase in _PROMPTS:
        return _PROMPTS[phase]
    if phase == "engage":
        from prometheus.prompts import engage_prompts as mod
    elif phase == "explore":
        from prometheus.prompts import explore_prompts as mod
    elif phase == "explain":
        from prometheus.prompts import explain_prompts as mod
    elif phase == "elaborate":
        from prometheus.prompts import elaborate_prompts as mod
    elif phase == "evaluate":
        from prometheus.prompts import evaluate_prompts as mod
    else:
        from prometheus.prompts import engage_prompts as mod
    _PROMPTS[phase] = mod
    return mod


def two_step_gen(
    phase: str,
    n: int,
    concept: str,
    llm_config=None,
    enabled_models=None,
    theme=None,
    image_settings=None,
    resource_config=None,
) -> str:
    mod = _load_prompts(phase)

    raw = generar_texto(
        mod.prompt_texto(n, concept, "", resource_config or {}),
        "texto",
        3000,
        llm_config,
        enabled_models,
    )

    try:
        json_data = parse_json(raw)
    except Exception:
        json_data = {"contenido": raw}

    # Image enrichment — only engage phase has prompt_imagen fields.
    img_replacements: dict[str, str] = {}
    if phase == "engage":
        from llm.images.image_providers import enrich_with_images

        img_replacements = enrich_with_images(
            json_data if isinstance(json_data, list) else [json_data],
            image_settings,
        )

    from llm.utils.themes import build_design_system

    theme = theme or {}
    ds = build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))

    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(
        generar_texto(
            mod.prompt_html(n, concept, json_str, "", ds),
            "codigo",
            12000,
            llm_config,
            enabled_models,
        )
    )

    if img_replacements:
        import re

        from llm.images.image_providers import IMG_PLACEHOLDER

        for placeholder, uri in img_replacements.items():
            html = html.replace(placeholder, uri)
        html = re.sub(r"__IMG_\d+__", IMG_PLACEHOLDER, html)

    from llm.ova_components import inject_components
    from llm.utils.html_validator import validate_and_repair
    from prometheus.engine.refine import maybe_refine

    html, _ = validate_and_repair(html, phase, n)
    if (theme or {}).get("design", "upao") == "upao":
        html = inject_components(html)
    return maybe_refine(html, phase, n, concept, llm_config, enabled_models, theme)
