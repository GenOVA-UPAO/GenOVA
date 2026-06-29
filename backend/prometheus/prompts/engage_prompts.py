"""Prompts for the 10 ENGAGE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
Machine Learning concept is passed in `concept` — no hardcoded ML subtopic.
"""

from prometheus.prompts._loader import render_html, render_simulador, render_texto
from prometheus.prompts._scaffold import with_user_context

RECURSOS_META = {
    1: {
        "tipo": "Cómic Interactivo",
        "duracion": "1–2 min",
        "interactividad": "Alta",
        "emoji": "🎭",
    },
    2: {
        "tipo": "Storyboard de Video",
        "duracion": "40 seg",
        "interactividad": "Baja",
        "emoji": "🎬",
    },
    3: {"tipo": "Micro-Podcast", "duracion": "45 seg", "interactividad": "Baja", "emoji": "🎙️"},
    4: {
        "tipo": "Juego de Gamificación",
        "duracion": "1–2 min",
        "interactividad": "Alta",
        "emoji": "🎮",
    },
    5: {"tipo": "Dilema Ético", "duracion": "2–3 min", "interactividad": "Media", "emoji": "⚖️"},
    6: {
        "tipo": "Noticia de Impacto",
        "duracion": "1–2 min",
        "interactividad": "Baja",
        "emoji": "📰",
    },
    7: {"tipo": "Juego de Roles", "duracion": "2–3 min", "interactividad": "Media", "emoji": "🎯"},
    8: {
        "tipo": "Timeline Interactivo",
        "duracion": "2–3 min",
        "interactividad": "Media",
        "emoji": "📅",
    },
    9: {
        "tipo": "Escape Room Virtual",
        "duracion": "3–4 min",
        "interactividad": "Alta",
        "emoji": "🔐",
    },
    10: {
        "tipo": "Simulador Intuitivo",
        "duracion": "2–3 min",
        "interactividad": "Alta",
        "emoji": "🎛️",
    },
}


def prompt_texto(
    n: int, concept: str, contexto_usuario: str = "", config: dict | None = None
) -> str:
    return with_user_context(render_texto("engage", n, concept, config), contexto_usuario)


def prompt_simulador(
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return with_user_context(
        render_simulador("engage", concept, design_system, config), contexto_usuario
    )


def prompt_codigo(
    n: int,
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return prompt_simulador(concept, contexto_usuario, design_system, config)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    return with_user_context(
        render_html("engage", n, concept, data_json, design_system), contexto_usuario
    )
