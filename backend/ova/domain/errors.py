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
