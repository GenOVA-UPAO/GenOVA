"""LangGraph checkpointer backed by the same Supabase PostgreSQL instance.

If DATABASE_URL is a postgres URL, creates a PostgresSaver; otherwise falls
back to an in-memory MemorySaver (dev/test mode).
"""

import logging
import os
import re

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver

logger = logging.getLogger(__name__)


def _to_libpq_url(url: str) -> str:
    """Strip the SQLAlchemy driver suffix so libpq/psycopg can parse the URL.

    ``database.py`` normalizes DATABASE_URL to ``postgresql+psycopg://...`` for
    SQLAlchemy. PostgresSaver.from_conn_string feeds the string straight to
    libpq's conninfo parser, which only knows ``postgresql://`` / ``postgres://``
    and rejects the ``+psycopg`` dialect tag as an invalid connection option.
    """
    return re.sub(r"^(postgres(?:ql)?)\+[a-z0-9]+://", r"\1://", url, count=1)


def get_checkpointer():
    # In CI (GitHub Actions sets CI=true) use MemorySaver to avoid holding
    # psycopg connections against the shared test DB pool.
    if os.getenv("CI"):
        logger.info("CI environment — LangGraph MemorySaver")
        return MemorySaver()
    url = os.getenv("DATABASE_URL", "")
    if url and ("postgresql" in url or url.startswith("postgres://")):
        try:
            cm = PostgresSaver.from_conn_string(_to_libpq_url(url))
            # Newer langgraph-checkpoint-postgres returns a context manager.
            saver = cm.__enter__() if hasattr(cm, "__enter__") else cm
            saver.setup()
            logger.info("LangGraph PostgresSaver initialized")
            return saver
        except Exception:
            logger.exception("PostgresSaver init failed, falling back to MemorySaver")
    logger.info("LangGraph MemorySaver fallback")
    return MemorySaver()
