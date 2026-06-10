"""RAG domain — vector search, file uploads, RAG ingestion pipeline.

Prefixes (set in main.py):
  /api/rag      → router (health, debug, embedder info)
  /api/uploads  → uploads_router (POST file upload → triggers RAG ingestion)
"""
from rag.router import router as router  # noqa: F401
from uploads.router import router as uploads_router

__all__ = ["router", "uploads_router"]
