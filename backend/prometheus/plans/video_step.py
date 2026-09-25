"""Paso de video de los recursos de video 5E (engage 2, explore 4, explain 1).

Con la tarea Video activa y con modelo, el video se encarga en cuanto existe el
guion (JSON del paso de texto) y se genera EN PARALELO con el HTML del recurso:
el sondeo tarda minutos y no debe sumarse al tiempo del LLM. Al terminar el
HTML se espera al video (con su propio tope) y se inserta; si no llega, el
recurso se queda con el guion, como sin video. Mientras tanto el latido del job
(`generation.infrastructure.heartbeat`, cada 30 s) evita que parezca colgado.
"""

from __future__ import annotations

from concurrent.futures import Future, ThreadPoolExecutor

import structlog

logger = structlog.get_logger(__name__)

# Pocos a la vez: cada uno es un trabajo de pago que tarda minutos.
_POOL = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ova-video")
_WAIT_SLACK_S = 60.0


def start_video(
    phase: str,
    rt,
    concept: str,
    json_data,
    llm_config: dict | None,
) -> Future | None:
    """Encarga el video del recurso, o None si no toca (tipo, interruptor, modelo)."""
    from prometheus.config.nodes_catalog import is_video_resource

    try:
        video = is_video_resource(phase, rt)
    except (TypeError, ValueError):  # tipo antiguo con nombre («Cómic Interactivo»)
        return None
    if not video:
        return None
    try:
        from llm.images.video_embed import video_prompt
        from llm.images.video_generation import cache_key, generate_video, video_chain_for
        from llm.utils.llm_helpers import OWNER_FIELD

        chain = video_chain_for(llm_config)
        if not chain:
            return None
        models = ",".join(f"{e['provider']}/{e['model_id']}" for e in chain)
        owner = (llm_config or {}).get(OWNER_FIELD, "")
        reuse = cache_key(owner, concept, phase, rt, models)
        prompt = video_prompt(json_data, concept)
        return _POOL.submit(generate_video, prompt, chain, reuse_key=reuse)
    except Exception:  # noqa: BLE001 — el video es opcional: nunca tumba el recurso
        logger.exception("video step could not start", phase=phase, resource_type=rt)
        return None


def attach_video(html: str, pending: Future | None) -> str:
    """HTML con el video si llegó a tiempo; el mismo HTML si no."""
    if pending is None:
        return html
    try:
        from llm.images.video_embed import inject_video
        from llm.images.video_generation import default_options

        result = pending.result(timeout=default_options().timeout_s + _WAIT_SLACK_S)
    except Exception:  # noqa: BLE001 — tope o fallo: se queda el guion
        logger.exception("video step failed; keeping the script")
        return html
    if result is None:
        logger.info("no video generated; keeping the script")
        return html
    return inject_video(html, result.data_uri, provider=result.provider, model_id=result.model_id)
