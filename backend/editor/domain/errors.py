"""Excepciones de dominio del editor visual."""

from __future__ import annotations


class EditorDomainError(Exception):
    """Error base del dominio del editor."""


class GuardRejectedError(EditorDomainError):
    """La instrucción fue rechazada por los guardrails."""

    def __init__(self, reason: str, motivo: str):
        super().__init__(motivo)
        self.reason = reason
        self.motivo = motivo


class UnfeasibleIntentError(EditorDomainError):
    """La intención no es factible sobre los bloques existentes."""

    def __init__(self, motivo: str, reason: str = "unfeasible"):
        super().__init__(motivo)
        self.motivo = motivo
        self.reason = reason


class InvalidBlockError(EditorDomainError):
    """El bloque no tiene una estructura válida."""
