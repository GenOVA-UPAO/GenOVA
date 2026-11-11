"""LangGraph checkpointer for the OVA generation graph.

Default is NO checkpointer, and that is the right choice here: the job's progress
is persisted at the OvaJobResource layer (runtime._persist_done),
and resume simply re-invokes the graph and skips rows already marked "done"
(jobs_runner._persist_results). The graph never reads LangGraph checkpoints, so a
saver buys nothing. Even an in-process MemorySaver is harmful: it keeps a
serialized copy of every channel value at every superstep (the results carry the
resources' HTML with base64 images, video and audio), so a 30 MB OVA grew the
process by ~250 MB while generating and pushed Render's 512 MB instance over its
memory limit (automatic restart mid-job). And on Supabase's Transaction pooler (pgbouncer)
it is actively harmful: idle eviction closes the saver's connection between jobs
("psycopg.OperationalError: the connection is closed"), and a persisted
checkpoint keyed by the job_id thread would short-circuit the graph on resume
(empty results → job wrongly marked "error").

A PostgresSaver is still available behind OVA_PG_CHECKPOINT=1 for deployments on
a session-mode connection where durable graph checkpoints are wanted. When
enabled we keep the connection context-manager alive for the process lifetime —
PostgresSaver.from_conn_string yields its connection from a `with` block, so
dropping the context manager would GC-close the connection right after setup.
The saver is built once per process: re-creating it per job replaced the held
context manager, and finalizing the old one closed the connection of the jobs
still running on it.
"""

import os
import re
import threading

import structlog

logger = structlog.get_logger(__name__)

# Holds the live PostgresSaver context manager so its connection isn't GC-closed,
# and the saver itself, shared by every job of the process.
_pg_cm = None
_pg_saver = None
_pg_lock = threading.Lock()


def _to_libpq_url(url: str) -> str:
    """Strip the SQLAlchemy driver suffix so libpq/psycopg can parse the URL.

    ``database.py`` normalizes DATABASE_URL to ``postgresql+psycopg://...`` for
    SQLAlchemy. PostgresSaver.from_conn_string feeds the string straight to
    libpq's conninfo parser, which only knows ``postgresql://`` / ``postgres://``
    and rejects the ``+psycopg`` dialect tag as an invalid connection option.
    """
    return re.sub(r"^(postgres(?:ql)?)\+[a-z0-9]+://", r"\1://", url, count=1)


def get_checkpointer():
    # Opt-in only: durable graph checkpoints are unused by resume and break on
    # the Transaction pooler; an in-memory saver only wastes RAM (see docstring).
    if not os.getenv("OVA_PG_CHECKPOINT"):
        return None

    url = os.getenv("DATABASE_URL", "")
    if url and ("postgresql" in url or url.startswith("postgres://")):
        with _pg_lock:
            saver = _pg_saver or _open_pg_saver(url)
        if saver is not None:
            return saver
    logger.info("LangGraph running without checkpointer")
    return None


def _open_pg_saver(url: str):
    """Abre el PostgresSaver del proceso (una sola vez). None si falla."""
    global _pg_cm, _pg_saver
    try:
        from langgraph.checkpoint.postgres import PostgresSaver

        cm = PostgresSaver.from_conn_string(_to_libpq_url(url))
        # Newer langgraph-checkpoint-postgres returns a context manager whose
        # connection lives only while the cm is referenced — keep it alive.
        saver = cm.__enter__() if hasattr(cm, "__enter__") else cm
        saver.setup()
    except Exception:
        logger.exception("PostgresSaver init failed, running without checkpointer")
        return None
    _pg_cm, _pg_saver = cm, saver
    logger.info("LangGraph PostgresSaver initialized")
    return saver
