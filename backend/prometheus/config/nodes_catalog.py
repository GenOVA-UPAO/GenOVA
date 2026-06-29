"""Static catalog of Prometheus nodes/capabilities (declarative data only).

Kept separate from nodes_config (which holds the TTL store + DB persistence) so
the data table doesn't bloat the logic module.
"""

_D = "Generador 5E"

NODES = [
    {
        "id": "concierge",
        "name": "Concierge",
        "role": "Planificador",
        "always_on": True,
        "description": "Descompone el prompt en plan de recursos 5E (Planner)",
    },
    {
        "id": "engage",
        "name": "Engage",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de enganche — Fase 1 del modelo 5E",
    },
    {
        "id": "explore",
        "name": "Explore",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de exploración — Fase 2",
    },
    {
        "id": "explain",
        "name": "Explain",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de explicación formal — Fase 3",
    },
    {
        "id": "elaborate",
        "name": "Elaborate",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de elaboración — Fase 4",
    },
    {
        "id": "evaluate",
        "name": "Evaluate",
        "role": _D,
        "always_on": True,
        "phase": True,
        "description": "Genera recursos de evaluación — Fase 5",
    },
    {
        "id": "critic",
        "name": "Crítico pedagógico",
        "role": "Evaluador",
        "always_on": False,
        "configurable": True,
        "flag": "ova_critic",
        "default": "0",
        "description": "Evalúa calidad pedagógica; re-genera con feedback si score bajo.",
        "param": {
            "key": "ova_reflection_rounds",
            "label": "Rondas máx",
            "type": "int",
            "min": 0,
            "max": 3,
            "default": 1,
        },
    },
    {
        "id": "editor",
        "name": "Editor de Coherencia 5E",
        "role": "Editor",
        "always_on": False,
        "configurable": True,
        "flag": "ova_editor",
        "default": "0",
        "description": "Revisa terminología y progresión 5E antes de ensamblar.",
    },
    {
        "id": "assemble",
        "name": "Assembler",
        "role": "Ensamblador",
        "always_on": True,
        "description": "Ensambla resultados y genera el paquete SCORM.",
    },
]

CAPABILITIES = [
    {
        "id": "images",
        "name": "Generador de imágenes",
        "role": "Medios",
        "always_on": True,
        "description": "Genera imágenes AI para recursos engage y las embebe como data URIs en el SCORM.",
    },
    {
        "id": "video",
        "name": "Generador de Video",
        "role": "Medios",
        "always_on": True,
        "status_key": "video_api_key",
        "description": "Recursos de video 5E. Sin API key → genera prompt copiable para el estudiante.",
    },
    {
        "id": "refine",
        "name": "Refinador estructural",
        "role": "Corrector",
        "always_on": False,
        "configurable": True,
        "flag": "ova_refine",
        "default": "1",
        "description": "Detecta y corrige defectos HTML/JS. Corre en paralelo por recurso.",
    },
]

VIDEO_RESOURCE_TYPES: dict[str, list[int]] = {
    "engage": [2],
    "explore": [4],
    "explain": [1],
}


def is_video_resource(phase: str, rt) -> bool:
    """Return True when resource_type rt belongs to the video node for phase."""
    return int(rt) in VIDEO_RESOURCE_TYPES.get(phase, [])
