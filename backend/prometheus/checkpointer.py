"""LangGraph checkpointer backed by the same Supabase PostgreSQL instance.

If DATABASE_URL is configured, creates a PostgresSaver; otherwise falls back
to an in-memory MemorySaver (dev/test mode). The checkpoint table is lazily
created on first use.
"""

import logging
import os

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver

logger = logging.getLogger(__name__)


def get_checkpointer():
    url = os.getenv("DATABASE_URL", "")
    if url:
        try:
            checkpointer = PostgresSaver.from_conn_string(url)
            logger.info("LangGraph PostgresSaver initialized")
            return checkpointer
        except Exception:
            logger.exception("PostgresSaver init failed, falling back to MemorySaver")
    logger.info("LangGraph MemorySaver fallback")
    return MemorySaver()
