"""OVA domain — CRUD, editing, versioning, trash, duplication, phase management.

Prefixes (set in main.py):
  /api/ova        → router (health, SCORM export)
  /api/ovas       → history_router, edit_router, add_phase_router,
                    phase_version_router, subelement_router
  /api/ova/jobs   → jobs_router (generation pipeline)
"""
from generation.jobs_router import router as jobs_router
from ova.crud.edit_router import router as edit_router
from ova.crud.subelement_router import router as subelement_router
from ova.phases.add_phase_router import router as add_phase_router
from ova.phases.history_router import router as history_router
from ova.phases.phase_version_router import router as phase_version_router
from ova.router import router as router  # noqa: F401

__all__ = [
    "router",
    "jobs_router",
    "history_router",
    "edit_router",
    "add_phase_router",
    "phase_version_router",
    "subelement_router",
]
