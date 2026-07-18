"""Agrupa los sub-runs LLM (wrap_openai) de una generación bajo un run raíz por
job en LangSmith.

Sin esto, los workers del fan-out (`Send`) corren en threads y el contextvar de
langsmith no cruza al thread → cada llamada al LLM arranca como run raíz suelto.
Aquí capturamos/creamos un RunTree "ova-generation" por job y reentramos su
contexto (`tracing_context(parent=...)`) alrededor de cada nodo, así todas las
llamadas cuelgan del mismo árbol.

No-op si el tracing está apagado (local/CI) → cero coste y cero riesgo. Nunca
impide correr el nodo: si la instrumentación falla, el nodo se ejecuta igual.
"""

from __future__ import annotations

import contextlib
import threading
from typing import Any

from core.config import settings

_parents: dict[str, Any] = {}
_lock = threading.Lock()


def _enabled() -> bool:
    return bool(settings.langsmith_tracing and settings.langsmith_api_key)


def _get_or_create(job_id: str) -> Any:
    with _lock:
        rt = _parents.get(job_id)
        if rt is None:
            from langsmith import RunTree

            rt = RunTree(
                name="ova-generation",
                run_type="chain",
                inputs={"job_id": job_id},
                metadata={"job_id": job_id},
            )
            with contextlib.suppress(Exception):
                rt.post()
            _parents[job_id] = rt
        return rt


@contextlib.contextmanager
def job_trace(job_id: Any):
    """Reentra el contexto de trace del job (o no-op) alrededor de un nodo.

    Setea dos cosas: (1) el contextvar propio `_CURRENT_PARENT` (que `_chat` lee y
    pasa EXPLÍCITO a wrap_openai — robusto a través de thread-pools), y (2) el
    contexto ambiente de langsmith (para el path secuencial). Nunca impide correr
    el nodo si la instrumentación falla.
    """
    if not (_enabled() and job_id):
        yield
        return
    cm = None
    token = None
    try:
        from langsmith.run_helpers import tracing_context

        from llm.clients.clients import set_current_parent

        rt = _get_or_create(str(job_id))
        token = set_current_parent(rt)
        cm = tracing_context(parent=rt)
        cm.__enter__()
    except Exception:  # nunca impedir la ejecución del nodo por instrumentar
        cm = None
    try:
        yield
    finally:
        if cm is not None:
            with contextlib.suppress(Exception):
                cm.__exit__(None, None, None)
        if token is not None:
            from llm.clients.clients import reset_current_parent

            reset_current_parent(token)


def end_job_trace(job_id: Any) -> None:
    """Cierra el RunTree del job (al terminar/abortar el invoke)."""
    if not job_id:
        return
    with _lock:
        rt = _parents.pop(str(job_id), None)
    if rt is not None:
        with contextlib.suppress(Exception):
            rt.end()
            rt.patch()
