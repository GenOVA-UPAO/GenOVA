"""Dominio de subidas temporales (arquitectura hexagonal).

Router HTTP: `uploads.interface.http.router`. API pública para otros dominios:
errores y `TempUpload` de `uploads.domain`.
"""

from uploads.domain import TempUpload, UploadError  # noqa: F401

__all__ = ["TempUpload", "UploadError"]
