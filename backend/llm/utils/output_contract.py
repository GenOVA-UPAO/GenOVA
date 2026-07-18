"""Contrato de salida (F4.3) — espejo textual del checklist del validador F2.3.

Vive en llm/utils (sin dependencias) para que themes.py pueda inyectarlo en
cada prompt sin importar el paquete prometheus (eso creaba un import circular:
utils → themes → prometheus/__init__ → concierge → utils).
Si cambias un check en prometheus/engine/validate.py, cambia su línea aquí.
"""


def output_contract() -> str:
    return (
        "[CONTRATO_DE_SALIDA — el sistema VERIFICA esto automáticamente y te hará "
        "corregirlo si falla]\n"
        "1. Existe al menos una llamada real a _scormComplete() alcanzable al "
        "completar la actividad.\n"
        "2. Hay al menos un elemento interactivo funcional (button/input/handler).\n"
        "3. Cero texto placeholder (nada de 'Contenido del card', lorem ipsum ni "
        "similares) — todo contenido es pedagógico, real y específico del concepto.\n"
        "4. El contenido está completamente desarrollado (no esqueleto): cada "
        "sección/pregunta/paso que pide la tarea existe con su contenido.\n"
        "5. Si la tarea especifica un número N de elementos, genera EXACTAMENTE N.\n"
        "6. Ningún texto visible al estudiante menciona fases 5E ni jerga interna "
        "(ENGAGE/EXPLORE/EXPLAIN/ELABORATE/EVALUATE, 'FASE ·', 'Fase 1', etc.). "
        "Badge/eyebrow/títulos solo con tipo de actividad + concepto.\n"
    )
