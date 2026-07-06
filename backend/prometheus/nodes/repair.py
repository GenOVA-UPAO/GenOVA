"""Repair node — one retry pass for resources that failed during their phase.

Fase 1 del plan maestro (F1.1): antes, un recurso fallido moría sin reintento
(max_retries=0) y su fila OvaJobResource quedaba "pending" para siempre. Este
nodo corre después de la última fase y antes del editor: reintenta cada recurso
fallido UNA vez (la cadena de fallback de modelos ya rota providers por dentro)
y marca como `exhausted` los que vuelven a fallar, para que la reconciliación
final (`_persist_results`) cierre la fila como "error" en vez de dejarla colgada.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from prometheus.engine.runtime import _concurrency, _persist_done, _touch_job
from prometheus.engine.state import OvaGenerationState

logger = logging.getLogger(__name__)


def _dispatch_for(phase: str):
    """Late import — evita ciclos nodes↔graph y carga solo lo necesario."""
    from prometheus.nodes import elaborate, engage, evaluate, explain, explore

    return {
        "engage": (engage._dispatch, engage.RECURSOS_META),
        "explore": (explore._dispatch, explore.RECURSOS_META),
        "explain": (explain._dispatch, explain.RECURSOS_META),
        "elaborate": (elaborate._dispatch, elaborate.RECURSOS_META),
        "evaluate": (evaluate._dispatch, evaluate.RECURSOS_META),
    }[phase]


def _pending_failures(state: OvaGenerationState) -> list[dict]:
    """Errores acumulados cuyos recursos siguen sin HTML en results."""
    done = {f"{r.get('phase')}:{r.get('resource_type')}" for r in state.get("results", [])}
    seen: set[str] = set()
    pending = []
    for e in state.get("errors", []):
        key = f"{e.get('phase')}:{e.get('resource_type')}"
        if key in done or key in seen or e.get("exhausted"):
            continue
        seen.add(key)
        pending.append(e)
    return pending


def repair_node(state: OvaGenerationState) -> dict:
    failures = _pending_failures(state)
    if not failures:
        return {}

    concept = state.get("prompt", "")
    llm_config = state.get("llm_config", {})
    enabled_models = state.get("enabled_models", [])
    theme = state.get("theme", {})
    image_settings = state.get("image_settings", {})
    resource_configs = state.get("resource_configs", {})
    job_id = state.get("job_id")
    _touch_job(job_id)
    logger.info("repair: retrying %d failed resource(s)", len(failures))

    def _retry(err: dict):
        phase, rt = err["phase"], err["resource_type"]
        dispatch, meta = _dispatch_for(phase)
        per_config = resource_configs.get(f"{phase}:{rt}", {})
        try:
            html = dispatch(
                rt, concept, llm_config, enabled_models, theme, image_settings, per_config
            )
            return err, html
        except Exception as exc:  # noqa: BLE001 — aislar cada reintento
            logger.warning("repair: %s:%s failed again: %s", phase, rt, exc)
            return err, None

    results, exhausted = [], []
    workers = min(_concurrency(), len(failures))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_retry, e) for e in failures]
        for fut in as_completed(futures):
            err, html = fut.result()
            phase, rt = err["phase"], err["resource_type"]
            if html is not None:
                _, meta = _dispatch_for(phase)
                title = (meta.get(rt) or {}).get("tipo", "")
                results.append(
                    {"phase": phase, "html": html, "resource_type": rt, "title": title}
                )
                _persist_done(job_id, phase, rt, html)
                logger.info("repair: %s:%s recovered", phase, rt)
            else:
                exhausted.append({**err, "exhausted": True})

    return {"results": results, "errors": exhausted}
