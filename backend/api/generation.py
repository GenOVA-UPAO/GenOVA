"""Generation domain — OVA background jobs and phase regeneration.

Prefixes (set in main.py):
  /api/ova/jobs   → jobs_router (create, poll, resume, stop)
  /api/ovas       → regen_router (regenerate phase content)
"""
from generation.jobs_router import router as jobs_router
from generation.regen_router import router as regen_router

__all__ = ["jobs_router", "regen_router"]
