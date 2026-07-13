"""LangGraph entry point for the OVA multi-agent generation pipeline.

Motor unico: work-pool (`prometheus/engine/workpool.py`) — fan-out de un worker
por recurso via Send API, sin barreras de fase. El motor legacy por fases
(`concierge -> engage -> critic -> explore -> ... -> repair -> editor -> assemble`)
se elimino tras el benchmark F2 (6:21/20 recursos, 0 fallos, vs ~30min del motor
por fases). Ver docs/prometheus.md y docs/generacion-5e.md.
"""

import logging

logger = logging.getLogger(__name__)


def invoke_ova_generation(initial_state: dict, thread_id: str, checkpointer=None):
    from core.config import settings
    from core.logging_setup import build_invoke_config
    from prometheus.engine.checkpointer import get_checkpointer

    if settings.llm_fake:
        from prometheus.engine.fake_invoke import fake_invoke_ova_generation

        return fake_invoke_ova_generation(initial_state, thread_id, checkpointer)

    from prometheus.engine.workpool import build_workpool_graph

    graph = build_workpool_graph()
    cp = checkpointer or get_checkpointer()
    compiled = graph.compile(checkpointer=cp)

    config = build_invoke_config(
        thread_id=thread_id,
        max_concurrency=settings.ova_gen_concurrency,
        env=settings.env,
    )
    return compiled.invoke(initial_state, config)
