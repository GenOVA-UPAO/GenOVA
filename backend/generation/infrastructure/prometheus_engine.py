"""Adaptador del motor LangGraph de prometheus (EP-5, EN-003).

El import del grafo es PEREZOSO a propósito: se resuelve en el momento de la
llamada desde el namespace de `prometheus.engine.graph`, de modo que los tests
puedan hacer monkeypatch del símbolo sin importar este adaptador antes.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)


def invoke_generation(initial_state: dict, thread_id: str) -> tuple[list[dict], list[dict]]:
    """Invoca el grafo compilado y devuelve (results, errors).

    Nunca lanza: un fallo del motor deja el job en manos del caller (el runner
    decide el cierre por BD), igual que el try/except que vivía en el runner.
    """
    try:
        from prometheus.engine.graph import invoke_ova_generation

        final_state = invoke_ova_generation(initial_state, thread_id)
        return final_state.get("results", []), final_state.get("errors", [])
    except Exception:
        logger.exception("Prometheus graph failed", job_id=thread_id)
        return [], []
