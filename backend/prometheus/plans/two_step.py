"""Two-step generation plan: text/JSON → HTML.

Phase-agnostic. Dispatch to the correct prompt module based on `phase`.
"""

import json

from llm.router import generar_texto
from llm.utils import parse_json, strip_markdown

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


def two_step_gen(phase: str, n: int, concept: str, llm_config=None, enabled_models=None) -> str:
    mod = _load_prompts(phase)

    raw = generar_texto(
        mod.prompt_texto(n, concept, ""),
        "texto",
        3000,
        llm_config,
        enabled_models,
    )

    try:
        json_data = parse_json(raw)
    except Exception:
        json_data = {"contenido": raw}

    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    html = strip_markdown(
        generar_texto(
            mod.prompt_html(n, concept, json_str, ""),
            "codigo",
            12000,
            llm_config,
            enabled_models,
        )
    )

    from llm.html_validator import validate_and_repair

    html, _ = validate_and_repair(html, phase, n)
    return html
