"""Prompts for the 10 EVALUATE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all assessments, quizzes and
rubrics to whatever Machine Learning concept is passed in `concept`.
"""

from prometheus.prompts._loader import render_codigo, render_html, render_texto
from prometheus.prompts._scaffold import with_user_context

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Quiz Interactivo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "❓"},
    2: {"tipo": "Rúbrica de Autoevaluación", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📋"},
    3: {"tipo": "Desafío Contrarreloj", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "⏱️"},
    4: {"tipo": "Examen Opción Múltiple", "duracion": "3–4 min", "interactividad": "Media", "emoji": "📝"},
    5: {"tipo": "Completar Espacios", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "✍️"},
    6: {"tipo": "Relacionar Conceptos", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🔗"},
    7: {"tipo": "Crucigrama Conceptual", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🧩"},
    8: {"tipo": "Preguntas de Desarrollo", "duracion": "4–5 min", "interactividad": "Baja", "emoji": "💬"},
    9: {"tipo": "Simulación Evaluativa", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🎯"},
    10: {"tipo": "Diploma de Logro", "duracion": "1–2 min", "interactividad": "Baja", "emoji": "🏆"},
}
# fmt: on
CODE_ONLY = {3, 5, 9}


def prompt_codigo(
    n: int,
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return with_user_context(
        render_codigo("evaluate", n, concept, design_system, config), contexto_usuario
    )


def prompt_texto(
    n: int, concept: str, contexto_usuario: str = "", config: dict | None = None
) -> str:
    return with_user_context(render_texto("evaluate", n, concept, config), contexto_usuario)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    return with_user_context(
        render_html("evaluate", n, concept, data_json, design_system), contexto_usuario
    )
