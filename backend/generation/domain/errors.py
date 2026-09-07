"""Errores puros del ciclo de vida de un job de generación.

No conocen HTTP. `interface/http/error_map.py` los traduce al sobre JSON
``{"error", "message"}`` que ya consumía el frontend.
"""

from __future__ import annotations


class GenerationError(Exception):
    """Raíz de todos los errores del dominio de generación."""

    code = "generation_error"


class JobNotFound(GenerationError):
    code = "job_not_found"

    def __init__(self, message: str = "Job no encontrado.") -> None:
        super().__init__(message)


class JobNotRunning(GenerationError):
    code = "job_not_running"

    def __init__(self, message: str = "El job ya no está en curso.") -> None:
        super().__init__(message)
