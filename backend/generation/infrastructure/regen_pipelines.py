"""Regeneración de contenido de una fase de OVA.

`regenerate_phase_content` regenera un recurso de fase con el pipeline de
generación UNIFICADO (`prometheus.plans.generate.generate_resource`) — el mismo
que usa el batch — así regen produce la misma calidad (design-system, imágenes,
refinamiento) en TODAS las fases. Antes engage/explore estaban reimplementados en
versión ligera (regen-engage salía sin imágenes). La resolución del resource_type
vive en regen_agents.
"""

import structlog

logger = structlog.get_logger(__name__)

_VALID_PHASES = {"engage", "explore", "explain", "elaborate", "evaluate"}


def regenerate_phase_content(
    phase_type: str,
    resource_type: int,
    concept: str,
    llm_config: dict | None = None,
    enabled_models: list | None = None,
    image_settings: dict | None = None,
) -> str | None:
    """Genera HTML fresco para un recurso con el pipeline unificado.

    `llm_config` son los overrides por-tipo del dueño del OVA (o None). `enabled_models`
    restringe los overrides a modelos habilitados. `image_settings` habilita imágenes
    en engage. Devuelve el HTML o None si falla o la fase es desconocida.
    """
    if phase_type not in _VALID_PHASES:
        logger.warning("unknown phase_type for regen", phase_type=phase_type)
        return None
    try:
        from prometheus.plans.generate import generate_resource

        return generate_resource(
            phase_type,
            resource_type,
            concept,
            llm_config=llm_config,
            enabled_models=enabled_models,
            image_settings=image_settings,
        ).html
    except Exception:
        logger.exception(
            "regen failed",
            phase_type=phase_type,
            resource_type=resource_type,
            concept=concept[:60],
        )
        return None
