"""SCORM domain — SCORM 1.2 package assembly and storage.

Prefix (set in main.py):
  /api/scorm  → router (health endpoint; build logic lives in scorm/service.py)
"""
from scorm.router import router as router  # noqa: F401

__all__ = ["router"]
