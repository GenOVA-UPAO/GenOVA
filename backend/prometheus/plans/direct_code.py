"""Direct code generation plan — single call to generate HTML without JSON step.

Used for resources that are purely visual/code-based (simulators, animations, diagrams).
"""

from llm.router import generar_texto
from llm.utils.utils import strip_markdown

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


def direct_code_gen(
    phase: str, n: int, concept: str, llm_config=None, enabled_models=None, theme=None,
    resource_config=None,
) -> str:
    mod = _load_prompts(phase)

    from llm.utils.themes import build_design_system

    theme = theme or {}
    ds = build_design_system(theme.get("color", "upao"), theme.get("design", "upao"))

    html = strip_markdown(
        generar_texto(
            mod.prompt_codigo(n, concept, "", ds, resource_config or {}),
            "codigo",
            12000,
            llm_config,
            enabled_models,
        )
    )

    from llm.ova_components import inject_components
    from llm.utils.html_validator import validate_and_repair
    from prometheus.engine.refine import maybe_refine

    html, _ = validate_and_repair(html, phase, n)
    if theme.get("design", "upao") == "upao":
        html = inject_components(html)
    return maybe_refine(html, phase, n, concept, llm_config, enabled_models, theme)
