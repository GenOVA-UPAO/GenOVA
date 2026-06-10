"""Labs domain — prompt experimentation, model evaluation, single-resource generation UI.

Prefix (set in main.py):
  /api/labs  → router (admin catalog + base-prompt lookup)
  /api/labs  → generation_router (generate, improve, SCORM export, fetch results)
"""
from labs.generation_routes import router as generation_router
from labs.router import router as router  # noqa: F401

__all__ = ["router", "generation_router"]
