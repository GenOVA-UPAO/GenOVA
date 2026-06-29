"""Prompts for the 10 EXPLAIN-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
Machine Learning concept is passed in `concept` — no hardcoded ML subtopic.
"""

from prometheus.prompts._loader import render_codigo, render_html, render_texto
from prometheus.prompts._scaffold import with_user_context

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Video Teórico", "duracion": "2–3 min", "interactividad": "Baja", "emoji": "🎥"},
    2: {"tipo": "Lectura Guiada", "duracion": "4–5 min", "interactividad": "Baja", "emoji": "📖"},
    3: {"tipo": "Mapa Conceptual", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🗺️"},
    4: {"tipo": "FAQ Interactivo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "❓"},
    5: {"tipo": "Demo Animada", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "✨"},
    6: {"tipo": "Glosario Visual", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📝"},
    7: {"tipo": "Línea de Tiempo", "duracion": "2–3 min", "interactividad": "Media", "emoji": "⏳"},
    8: {"tipo": "Diagrama de Framework", "duracion": "1–2 min", "interactividad": "Alta", "emoji": "🧩"},
    9: {"tipo": "Tabla Comparativa", "duracion": "2–3 min", "interactividad": "Media", "emoji": "📊"},
    10: {"tipo": "Infografía Interactiva", "duracion": "2–3 min", "interactividad": "Alta", "emoji": "🎨"},
}
# fmt: on
CODE_ONLY = {3, 5, 8, 10}


def prompt_codigo(
    n: int,
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return with_user_context(
        render_codigo("explain", n, concept, design_system, config), contexto_usuario
    )


def prompt_texto(
    n: int, concept: str, contexto_usuario: str = "", config: dict | None = None
) -> str:
    return with_user_context(render_texto("explain", n, concept, config), contexto_usuario)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    return with_user_context(
        render_html("explain", n, concept, data_json, design_system), contexto_usuario
    )
