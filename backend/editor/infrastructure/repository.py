"""Repositorio SQLAlchemy para telemetría de feedback del editor visual."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from editor.application.ports import EditorFeedbackRepositoryPort
from editor.infrastructure.orm import EditorFeedback


class SqlAlchemyEditorFeedbackRepository(EditorFeedbackRepositoryPort):
    def __init__(self, db: Session):
        self._db = db

    def save_feedback(self, data: dict[str, Any]) -> str:
        record = EditorFeedback(
            user_id=data.get("user_id"),
            ova_id=data["ova_id"],
            fase_id=data.get("fase_id"),
            instruccion=data.get("instruccion"),
            bloques_antes=data.get("bloques_antes") or [],
            intencion_propuesta=data.get("intencion_propuesta"),
            intencion_final=data.get("intencion_final"),
            resultado=data.get("resultado", "applied"),
            confianza=data.get("confianza"),
            backend=data.get("backend"),
            motivo_rechazo=data.get("motivo_rechazo"),
        )
        self._db.add(record)
        self._db.commit()
        self._db.refresh(record)
        return str(record.id)
