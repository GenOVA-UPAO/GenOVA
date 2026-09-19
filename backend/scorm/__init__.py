"""Dominio SCORM (arquitectura hexagonal — dominio puro).

API pública: `build_scorm_zip_bytes`, `DEFAULT_PHASES`.
Router de health: `scorm.interface.http.router`.
"""

from scorm.domain import DEFAULT_PHASES, build_scorm_zip_bytes

__all__ = ["DEFAULT_PHASES", "build_scorm_zip_bytes"]
