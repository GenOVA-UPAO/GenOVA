"""LangGraph tool wrapping RAG semantic search for context enrichment."""

import structlog

logger = structlog.get_logger(__name__)


def rag_search(query: str, phase: str = "engage") -> str:
    try:
        from rag.retriever import retrieve_context

        result = retrieve_context(query)
        if result:
            return result[:3000]
    except Exception:
        logger.exception("RAG search failed", query=query[:100])
    return ""
