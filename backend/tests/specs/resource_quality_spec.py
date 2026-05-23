"""
Quality criteria for each ENGAGE and EXPLORE resource.
Used by test_resource_quality.py and prompt_lab.py.
Add a new criterion here when the frontend surfaces a new failure pattern.
"""

FORBIDDEN_CDN = [
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "unpkg.com",
    "code.jquery.com",
    "stackpath.bootstrapcdn.com",
    "ajax.googleapis.com",
    "maxcdn.bootstrapcdn.com",
]

# Strings that must appear in every generated HTML for SCORM to work
SCORM_REQUIRED = [
    "_scormInit",
    "_scormComplete",
    "cmi.core.lesson_status",
]

# ── ENGAGE quality specs ───────────────────────────────────────────────────────

ENGAGE_QUALITY = {
    1: {
        "label": "Cómic Interactivo",
        "min_chars": 3000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": ["prev", "next"],  # galería deslizable
    },
    2: {
        "label": "Video Opening",
        "min_chars": 2000,
        "required_tags": ["style", "script", "button"],
        "required_patterns": [],
    },
    3: {
        "label": "Micro-Podcast",
        "min_chars": 1500,
        "required_tags": ["style", "script"],
        "required_patterns": [],
    },
    4: {
        "label": "Juego de Gamificación",
        "min_chars": 3000,
        "required_tags": ["table", "button", "style", "script"],
        "required_patterns": [],
    },
    5: {
        "label": "Dilema Ético",
        "min_chars": 2000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    6: {
        "label": "Noticia de Impacto",
        "min_chars": 1500,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    7: {
        "label": "Juego de Roles",
        "min_chars": 2000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    8: {
        "label": "Timeline Interactivo",
        "min_chars": 2500,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    9: {
        "label": "Escape Room Virtual",
        "min_chars": 3000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    10: {
        "label": "Simulador Intuitivo",
        "min_chars": 3000,
        "required_tags": ["input", "svg", "style", "script"],
        "required_patterns": ["range"],  # slider tipo range
    },
}

# ── EXPLORE quality specs ──────────────────────────────────────────────────────

EXPLORE_QUALITY = {
    1: {
        "label": "Simulador Virtual Lab (K-Means)",
        "min_chars": 4000,
        "required_tags": ["svg", "button", "style", "script"],
        "required_patterns": [],
    },
    2: {
        "label": "Agente Socrático",
        "min_chars": 3000,
        "required_tags": ["input", "button", "style", "script"],
        "required_patterns": [],
    },
    3: {
        "label": "Juego Drag & Drop",
        "min_chars": 3000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": ["drag"],
    },
    4: {
        "label": "Video con Pausa Activa",
        "min_chars": 2500,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    5: {
        "label": "Lectura Interactiva",
        "min_chars": 2500,
        "required_tags": ["table", "button", "style", "script"],
        "required_patterns": [],
    },
    6: {
        "label": "Simulador de Slider (Learning Rate)",
        "min_chars": 4000,
        "required_tags": ["input", "svg", "button", "style", "script"],
        "required_patterns": ["range"],
    },
    7: {
        "label": "Experimento Guiado",
        "min_chars": 3500,
        "required_tags": ["svg", "button", "style", "script"],
        "required_patterns": [],
    },
    8: {
        "label": "Juego de Roles",
        "min_chars": 3000,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    9: {
        "label": "Mapa Mental",
        "min_chars": 3500,
        "required_tags": ["button", "style", "script"],
        "required_patterns": [],
    },
    10: {
        "label": "Lab de Hipótesis",
        "min_chars": 4000,
        "required_tags": ["svg", "button", "style", "script"],
        "required_patterns": [],
    },
}

QUALITY_BY_PHASE = {
    "engage": ENGAGE_QUALITY,
    "explore": EXPLORE_QUALITY,
}
