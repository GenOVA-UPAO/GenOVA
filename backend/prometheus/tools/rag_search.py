"""LangGraph tool wrapping RAG semantic search for context enrichment."""

import logging

logger = logging.getLogger(__name__)


def rag_search(query: str, phase: str = "engage") -> str:
    try:
        from rag.retriever import retrieve_context

        result = retrieve_context(query)
        if result:
            return result[:3000]
    except Exception:
        logger.exception("RAG search failed for query %r", query[:100])
    return ""
