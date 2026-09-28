"""Errores puros del ciclo de vida de una OVA."""

from __future__ import annotations


class OvaError(Exception):
    """Base de los errores del agregado OVA."""


class MetadataTitleRequired(OvaError):
    """El título queda vacío después de normalizarlo."""


class MetadataTitleTooLong(OvaError):
    """El título supera el límite aceptado por la interfaz."""


class OvaNotFound(OvaError):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class OvaForbidden(OvaError):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class OvaGenerating(OvaError):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class OvaEditError(OvaError):
    def __init__(self, status_code: int, error: str, message: str) -> None:
        self.status_code = status_code
        self.error = error
        self.message = message
        super().__init__(message)
