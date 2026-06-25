"""LangGraph checkpointer for the OVA generation graph.

Default is an in-process MemorySaver, and that is the right choice here: the
job's progress is persisted at the OvaJobResource layer (runtime._persist_done),
and resume simply re-invokes the graph and skips rows already marked "done"
(jobs_runner._persist_results). The graph never reads LangGraph checkpoints, so a
persistent saver buys nothing — and on Supabase's Transaction pooler (pgbouncer)
it is actively harmful: idle eviction closes the saver's connection between jobs
("psycopg.OperationalError: the connection is closed"), and a persisted
checkpoint keyed by the job_id thread would short-circuit the graph on resume
(empty results → job wrongly marked "error").

A PostgresSaver is still available behind OVA_PG_CHECKPOINT=1 for deployments on
a session-mode connection where durable graph checkpoints are wanted. When
enabled we keep the connection context-manager alive for the process lifetime —
PostgresSaver.from_conn_string yields its connection from a `with` block, so
dropping the context manager would GC-close the connection right after setup.
"""

import logging
import os
import re

from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)

# Holds the live PostgresSaver context manager so its connection isn't GC-closed.
_pg_cm = None


def _to_libpq_url(url: str) -> str:
    """Strip the SQLAlchemy driver suffix so libpq/psycopg can parse the URL.

    ``database.py`` normalizes DATABASE_URL to ``postgresql+psycopg://...`` for
    SQLAlchemy. PostgresSaver.from_conn_string feeds the string straight to
    libpq's conninfo parser, which only knows ``postgresql://`` / ``postgres://``
    and rejects the ``+psycopg`` dialect tag as an invalid connection option.
    """
    return re.sub(r"^(postgres(?:ql)?)\+[a-z0-9]+://", r"\1://", url, count=1)


def get_checkpointer():
    global _pg_cm

    # Opt-in only: durable graph checkpoints are unused by resume and break on
    # the Transaction pooler (see module docstring).
    if not os.getenv("OVA_PG_CHECKPOINT"):
        return MemorySaver()

    url = os.getenv("DATABASE_URL", "")
    if url and ("postgresql" in url or url.startswith("postgres://")):
        try:
            from langgraph.checkpoint.postgres import PostgresSaver

            cm = PostgresSaver.from_conn_string(_to_libpq_url(url))
            # Newer langgraph-checkpoint-postgres returns a context manager whose
            # connection lives only while the cm is referenced — keep it alive.
            saver = cm.__enter__() if hasattr(cm, "__enter__") else cm
            saver.setup()
            _pg_cm = cm
            logger.info("LangGraph PostgresSaver initialized")
            return saver
        except Exception:
            logger.exception("PostgresSaver init failed, falling back to MemorySaver")
    logger.info("LangGraph MemorySaver fallback")
    return MemorySaver()
