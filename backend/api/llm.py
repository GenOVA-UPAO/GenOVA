"""LLM domain — model catalog, LLM dispatch, per-phase generation endpoints (legacy), media generation.

Capabilities bundled here:
  - LLM dispatch: Groq (primary) + OpenRouter (fallback)
  - Model catalog: curated allowlist, pricing, per-task defaults
  - Legacy single-resource generation: ENGAGE and EXPLORE HTTP endpoints
  - Media generation: images (Pollinations.ai), podcast TTS, audio transcription

Prefix (set in main.py):
  /api/agents  → router (catalog + legacy ENGAGE/EXPLORE endpoints — prefix kept for backwards compat)
"""
from llm.catalog_router import router as router  # noqa: F401

__all__ = ["router"]
