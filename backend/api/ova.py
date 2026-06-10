"""OVA domain — CRUD, editing, versioning, trash, duplication, phase management.

Prefixes (set in main.py):
  /api/ova        → router (health, SCORM export)
  /api/ovas       → history_router, edit_router, add_phase_router,
                    phase_version_router, subelement_router
  /api/ova/jobs   → jobs_router (generation pipeline)
"""
from generation.jobs_router import router as jobs_router
from ova.add_phase_router import router as add_phase_router
from ova.edit_router import router as edit_router
from ova.history_router import router as history_router
from ova.phase_version_router import router as phase_version_router
from ova.router import router as router  # noqa: F401
from ova.subelement_router import router as subelement_router

__all__ = [
    "router",
    "jobs_router",
    "history_router",
    "edit_router",
    "add_phase_router",
    "phase_version_router",
    "subelement_router",
]
