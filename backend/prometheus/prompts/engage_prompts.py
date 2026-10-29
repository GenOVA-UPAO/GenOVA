"""Prompts for the 10 ENGAGE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all content to whatever
concept is passed in `concept` (any area; the level comes from the request) —
no hardcoded subtopic.
"""

from prometheus.prompts._loader import render_texto
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
    """Prompt de texto para engage:3 (micro-podcast)."""
    return with_user_context(render_texto("engage", n, concept, config, contexto_usuario), contexto_usuario)
