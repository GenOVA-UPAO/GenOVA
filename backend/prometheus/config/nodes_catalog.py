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

# Imagen y video no se encienden aquí: son las tareas «Imagen» y «Video» de
# /models (modelo + interruptor `generation_enabled`); la narración depende solo
# de las claves. `media_task` le dice a la UI de qué entrada leer el estado real
# (`media_status` en /admin/nodes-config).
CAPABILITIES = [
    {
        "id": "images",
        "name": "Generador de imágenes",
        "role": "Medios",
        "always_on": False,
        "media_task": "imagen",
        "description": "Genera imágenes AI para recursos engage y las embebe como data URIs en el SCORM.",
    },
    {
        "id": "video",
        "name": "Generador de Video",
        "role": "Medios",
        "always_on": False,
        "media_task": "video",
        "description": (
            "Genera un video corto para los recursos de video 5E con la tarea Video de "
            "/models. Desactivado, sin modelo o si falla, entrega el guion y un prompt copiable."
        ),
    },
    {
        # Sin interruptor: el micro-podcast se narra con la clave que haya
        # (OpenRouter en español; si no, Groq Orpheus en inglés; si no, solo texto).
        "id": "audio",
        "name": "Narración de audio",
        "role": "Medios",
        "always_on": False,
        "media_task": "audio",
        "description": (
            "Narra el micro-podcast de enganche: en español con OpenRouter y, sin su "
            "clave, en inglés con Groq Orpheus. Sin ninguna clave queda solo en texto."
        ),
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
