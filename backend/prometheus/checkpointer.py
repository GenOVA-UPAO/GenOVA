"""LangGraph checkpointer backed by the same Supabase PostgreSQL instance.

If DATABASE_URL is a postgres URL, creates a PostgresSaver; otherwise falls
back to an in-memory MemorySaver (dev/test mode).
"""

import logging
import os

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver

logger = logging.getLogger(__name__)


def get_checkpointer():
    url = os.getenv("DATABASE_URL", "")
    if url and ("postgresql" in url or url.startswith("postgres://")):
        try:
            cm = PostgresSaver.from_conn_string(url)
            # Newer langgraph-checkpoint-postgres returns a context manager.
            saver = cm.__enter__() if hasattr(cm, "__enter__") else cm
            saver.setup()
            logger.info("LangGraph PostgresSaver initialized")
            return saver
        except Exception:
            logger.exception("PostgresSaver init failed, falling back to MemorySaver")
    logger.info("LangGraph MemorySaver fallback")
    return MemorySaver()
