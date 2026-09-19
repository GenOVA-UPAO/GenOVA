"""Reglas puras del núcleo de ejecución de un job (EP-5 / EN-013).

Siembra del plan del grafo LangGraph desde los recursos pedidos por el
cliente, construcción del estado inicial, decisión de cierre del job y
agrupación de resultados del grafo. Sin DB, sin LLM, sin HTTP.
"""

from __future__ import annotations

PHASE_ORDER = ("engage", "explore", "explain", "elaborate", "evaluate")


def seed_plan(resources: list[dict]) -> tuple[dict, list[str]]:
    """Construye (phases, phase_order) del estado del grafo desde los recursos
    pedidos por el cliente. ``resources`` = [{phase_type, resource_type}, ...]
    (snapshot en job.params). El concierge se salta cuando ambos vienen poblados.
    Devuelve ({}, []) si no hay recursos (modo legacy → concierge planifica)."""
    phases: dict[str, list[dict]] = {}
    for r in resources:
        phase = (r.get("phase_type") or "").strip().lower()
        if phase not in PHASE_ORDER:
            continue
        raw = r.get("resource_type")
        try:
            rt: object = int(str(raw).strip())
        except (TypeError, ValueError):
            rt = raw
        items = phases.setdefault(phase, [])
        items.append({"resource_type": rt, "resource_order": len(items)})
    phase_order = [p for p in PHASE_ORDER if p in phases]
    return phases, phase_order


def build_graph_state(
    *,
    prompt: str,
    params: dict,
    job_id,
    only_resource_ids: list | None,
    phases_seed: dict,
    phase_order_seed: list[str],
) -> dict:
    """Estado inicial del grafo a partir del snapshot de params del job.

    Los `or` sobre valores del payload son deliberados (payloads flojos de la
    API: ''/vacío y ausente significan lo mismo aquí).
    """
    return {
        "prompt": prompt,
        "upload_ids": params.get("upload_ids") or [],
        "llm_config": params.get("llm_config") or {},
        "enabled_models": params.get("enabled_models") or [],
        "theme": params.get("theme") or {"color": "upao", "design": "upao"},
        "image_settings": params.get("image_settings") or {},
        "resource_configs": params.get("resource_configs") or {},
        "job_id": str(job_id),
        "phases": phases_seed,
        "phase_order": phase_order_seed,
        "results": [],
        "errors": [],
        "current_phase_idx": 0,
        "current_resource_idx": 0,
        "only_resource_ids": [str(r) for r in only_resource_ids] if only_resource_ids else None,
    }


def finish_status(has_unfinished: bool, any_done: bool) -> str:
    """Estado final de un job.

    "done" requiere que TODO recurso haya alcanzado estado terminal; recursos
    aún pending/running (grafo abortado a mitad) dejan el job resumible como
    "interrupted" en vez de enviar un OVA incompleto como terminado.
    """
    if has_unfinished:
        return "interrupted"
    return "done" if any_done else "error"


def build_result_maps(results: list[dict], errors: list[dict]) -> tuple[dict, dict]:
    """(result_map, exhausted_map) que cruza los resultados del grafo con las
    filas OvaJobResource. Clave por "phase:resource_type" y, si el resultado
    trae título distinto, también por "phase:title" (alias de detalle)."""
    result_map: dict[str, dict] = {}
    for r in results:
        phase = r.get("phase", "")
        rt = r.get("resource_type", "")
        key = f"{phase}:{rt}"
        if key not in result_map:
            result_map[key] = r
        title = r.get("title", "")
        if title and title != rt:
            result_map.setdefault(f"{phase}:{title}", r)

    exhausted_map = {
        f"{e.get('phase', '')}:{e.get('title') or e.get('resource_type', '')}": e
        for e in errors
        if e.get("exhausted")
    }
    return result_map, exhausted_map
