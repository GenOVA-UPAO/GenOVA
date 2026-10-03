"""Caso de uso: Registrar telemetría de feedback docente."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from editor.application.dto import FeedbackInput
from editor.application.ports import EditorFeedbackRepositoryPort


@dataclass(frozen=True, slots=True)
class RecordFeedbackUseCase:
    feedback_repo: EditorFeedbackRepositoryPort

    def execute(self, params: FeedbackInput) -> dict[str, Any]:
        data = {
            "user_id": params.user_id,
            "ova_id": params.ova_id,
            "fase_id": params.fase_id,
            "instruccion": params.instruccion,
            "bloques_antes": params.bloques_antes,
            "intencion_propuesta": params.intencion_propuesta,
            "intencion_final": params.intencion_final,
            "resultado": params.resultado,
            "confianza": params.confianza,
            "backend": params.backend,
            "motivo_rechazo": params.motivo_rechazo,
        }
        feedback_id = self.feedback_repo.save_feedback(data)
        return {
            "success": True,
            "feedback_id": feedback_id,
        }
