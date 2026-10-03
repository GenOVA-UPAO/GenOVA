"""Casos de uso del editor visual."""

from editor.application.use_cases.confirm_and_apply import ConfirmAndApplyUseCase
from editor.application.use_cases.interpret_and_apply import InterpretAndApplyUseCase
from editor.application.use_cases.record_feedback import RecordFeedbackUseCase

__all__ = [
    "ConfirmAndApplyUseCase",
    "InterpretAndApplyUseCase",
    "RecordFeedbackUseCase",
]
