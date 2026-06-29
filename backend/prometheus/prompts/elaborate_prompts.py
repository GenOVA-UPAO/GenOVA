"""Prompts for the 10 ELABORATE-phase resources (5E methodology).

Each prompt fixes the resource FORMAT but adapts all scenarios, exercises and
projects to whatever Machine Learning concept is passed in `concept`.
"""

from prometheus.prompts._loader import render_codigo, render_html, render_texto
from prometheus.prompts._scaffold import with_user_context

# fmt: off
RECURSOS_META = {
    1: {"tipo": "Estudio de Caso", "duracion": "4–5 min", "interactividad": "Media", "emoji": "📋"},
    2: {"tipo": "Ejercicio Guiado", "duracion": "5–6 min", "interactividad": "Media", "emoji": "✏️"},
    3: {"tipo": "Mini-Proyecto", "duracion": "8–10 min", "interactividad": "Alta", "emoji": "🛠️"},
    4: {"tipo": "Simulación Aplicada", "duracion": "3–4 min", "interactividad": "Alta", "emoji": "🔬"},
    5: {"tipo": "Análisis de Datos", "duracion": "4–5 min", "interactividad": "Alta", "emoji": "📈"},
    6: {"tipo": "Escenario Ramificado", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🌳"},
    7: {"tipo": "Lab de Código", "duracion": "5–7 min", "interactividad": "Alta", "emoji": "💻"},
    8: {"tipo": "Mapa de Problemas", "duracion": "3–4 min", "interactividad": "Media", "emoji": "🧭"},
    9: {"tipo": "Juego de Estrategia", "duracion": "4–5 min", "interactividad": "Alta", "emoji": "♟️"},
    10: {"tipo": "Reto de Diseño", "duracion": "6–8 min", "interactividad": "Media", "emoji": "🏗️"},
}
# fmt: on
CODE_ONLY = {4, 5, 7, 9}


def prompt_codigo(
    n: int,
    concept: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
    config: dict | None = None,
) -> str:
    return with_user_context(
        render_codigo("elaborate", n, concept, design_system, config), contexto_usuario
    )


def prompt_texto(
    n: int, concept: str, contexto_usuario: str = "", config: dict | None = None
) -> str:
    return with_user_context(render_texto("elaborate", n, concept, config), contexto_usuario)


def prompt_html(
    n: int,
    concept: str,
    data_json: str,
    contexto_usuario: str = "",
    design_system: str | None = None,
) -> str:
    return with_user_context(
        render_html("elaborate", n, concept, data_json, design_system), contexto_usuario
    )
