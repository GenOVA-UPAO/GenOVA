"""Prompts for the 10 EXPLORE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts its content, datasets and
mechanics to whatever Machine Learning concept is passed in `concept`.
"""

from prometheus.prompts._loader import render_codigo, render_html, render_texto
from prometheus.prompts._scaffold import with_user_context

RECURSOS_META = {
    1: {
        "tipo": "Simulador Virtual Lab",
        "duracion": "3–4 min",
        "interactividad": "Alta",
        "emoji": "🧪",
    },
    2: {"tipo": "Agente Socrático", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🤔"},
    3: {
        "tipo": "Juego Drag & Drop",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "🎮",
    },
    4: {
        "tipo": "Video con Pausa Activa",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "🎬",
    },
    5: {
        "tipo": "Lectura Interactiva",
        "duracion": "3–4 min",
        "interactividad": "Media",
        "emoji": "📖",
    },
    6: {
        "tipo": "Simulador de Slider",
        "duracion": "4–5 min",
        "interactividad": "Alta",
        "emoji": "🎛️",
    },
    7: {
        "tipo": "Experimento Guiado",
        "duracion": "5–6 min",
        "interactividad": "Media",
        "emoji": "🔬",
    },
    8: {"tipo": "Juego de Roles", "duracion": "4–5 min", "interactividad": "Media", "emoji": "🎭"},
    9: {"tipo": "Mapa Mental", "duracion": "5–6 min", "interactividad": "Alta", "emoji": "🗺️"},
    10: {
        "tipo": "Lab de Hipótesis",
        "duracion": "5–7 min",
        "interactividad": "Alta",
        "emoji": "💡",
    },
}

CODE_ONLY = {1, 6, 10}


def prompt_codigo(
    n: int,
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return with_user_context(
        render_codigo("explore", n, concept, design_system, config), contexto_usuario
    )


def prompt_texto(
    n: int, concept: str, contexto_usuario: str = "", config: dict | None = None
) -> str:
    return with_user_context(render_texto("explore", n, concept, config), contexto_usuario)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    return with_user_context(
        render_html("explore", n, concept, data_json, design_system), contexto_usuario
    )
