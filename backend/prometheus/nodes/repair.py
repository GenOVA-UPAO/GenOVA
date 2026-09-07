"""Repair node — one retry pass for resources that failed during their phase.

Fase 1 del plan maestro (F1.1): antes, un recurso fallido moría sin reintento
(max_retries=0) y su fila OvaJobResource quedaba "pending" para siempre. Este
nodo corre después de la última fase y antes del editor: reintenta cada recurso
fallido UNA vez (la cadena de fallback de modelos ya rota providers por dentro)
y marca como `exhausted` los que vuelven a fallar, para que la reconciliación
final (`_persist_results`) cierre la fila como "error" en vez de dejarla colgada.
"""

import contextvars
from concurrent.futures import ThreadPoolExecutor, as_completed

import structlog

from prometheus.engine.runtime import _concurrency, _persist_outcome, _touch_job
from prometheus.engine.state import OvaGenerationState

logger = structlog.get_logger(__name__)


def _recursos_meta_for(phase: str) -> dict:
    """Late import — carga solo el módulo de prompts de la fase pedida."""
    from prometheus.prompts import (
        elaborate_prompts,
        engage_prompts,
        evaluate_prompts,
        explain_prompts,
        explore_prompts,
    )

    return {
        "engage": engage_prompts.RECURSOS_META,
        "explore": explore_prompts.RECURSOS_META,
        "explain": explain_prompts.RECURSOS_META,
        "elaborate": elaborate_prompts.RECURSOS_META,
        "evaluate": evaluate_prompts.RECURSOS_META,
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
    logger.info("repair: retrying failed resources", count=len(failures))

    def _retry(err: dict):
        phase, rt = err["phase"], err["resource_type"]
        per_config = resource_configs.get(f"{phase}:{rt}", {})
        # F3.2 — deliberación del reintento: si el intento original usó
        # two_step (2 llamadas LLM, más exposición a fallos), degradar a
        # direct_code cuando existe plantilla; si no hay degradación, mismo
        # plan (la cadena de fallback de modelos ya rota providers por dentro).
        from prometheus.plans.generate import generate_resource
        from prometheus.plans.plan_map import degraded_plan, plan_for

        original = err.get("plan") or plan_for(phase, rt)
        plan = degraded_plan(phase, rt, original) or original
        if plan != original:
            logger.info(
                "repair: deliberación plan degradado", phase=phase, resource_type=rt, plan=plan
            )
        try:
            result = generate_resource(
                phase,
                rt,
                concept,
                plan=plan,
                llm_config=llm_config,
                enabled_models=enabled_models,
                theme=theme,
                image_settings=image_settings,
                resource_config=per_config,
            )
            return err, result.html, result.defects
        except Exception as exc:  # noqa: BLE001 — aislar cada reintento
            logger.warning("repair: failed again", phase=phase, resource_type=rt, error=str(exc))
            return err, None, []

    results, exhausted = [], []
    workers = min(_concurrency(), len(failures))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        # copy_context: propaga el contextvar del parent (job_trace) al sub-thread para
        # que los reintentos LLM aniden bajo el trace del job (LangSmith).
        futures = [pool.submit(contextvars.copy_context().run, _retry, e) for e in failures]
        for fut in as_completed(futures):
            err, html, defects = fut.result()
            phase, rt = err["phase"], err["resource_type"]
            if html is not None:
                kept, remaining = html, list(defects)
            else:
                kept, remaining = err.get("html"), list(err.get("defects") or [])
            if kept:
                meta = _recursos_meta_for(phase)
                title = (meta.get(rt) or {}).get("tipo", "")
                results.append(
                    {
                        "phase": phase,
                        "html": kept,
                        "resource_type": rt,
                        "title": title,
                        "defects": remaining,
                    }
                )
                _persist_outcome(job_id, phase, rt, kept, defects=remaining)
                if remaining:
                    logger.info(
                        "repair: resource still defective",
                        phase=phase,
                        resource_type=rt,
                        defects=remaining,
                    )
                    exhausted.append(
                        {
                            **err,
                            "exhausted": True,
                            "error": "defectos estructurales sin resolver: "
                            + "; ".join(remaining),
                        }
                    )
                else:
                    logger.info("repair: resource recovered", phase=phase, resource_type=rt)
            else:
                exhausted.append({**err, "exhausted": True})

    return {"results": results, "errors": exhausted}
