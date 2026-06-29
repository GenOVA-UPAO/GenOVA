"""Progress-stage labels for the regeneration status endpoint."""

PROGRESS_STAGES = [
    (10, "Iniciando regeneración"),
    (35, "Procesando contenido"),
    (65, "Generando fases seleccionadas"),
    (90, "Reconstruyendo paquete SCORM"),
    (100, "Finalizando"),
]


def _resolve_regen_stage(pct: int) -> str:
    for threshold, label in PROGRESS_STAGES:
        if pct <= threshold:
            return label
    return PROGRESS_STAGES[-1][1]
