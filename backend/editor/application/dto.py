"""Data Transfer Objects (DTOs) para los casos de uso del editor visual."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from editor.domain.model import Intent, IntentTrace, ResourceBlock


@dataclass(frozen=True, slots=True)
class InterpretAndApplyInput:
    instruction: str
    blocks: list[ResourceBlock]
    backend: str = "hybrid"
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class InterpretAndApplyOutput:
    intent: Intent
    blocks: list[ResourceBlock]
    trace: IntentTrace
    requiere_confirmacion: bool
    motivo: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "intent": self.intent.to_dict(),
            "blocks": [b.to_dict() for b in self.blocks],
            "trace": self.trace.to_dict(),
            "requiere_confirmacion": self.requiere_confirmacion,
            "motivo": self.motivo,
        }


@dataclass(frozen=True, slots=True)
class ConfirmAndApplyInput:
    ova_id: str
    phase_id: str
    instruction: str
    blocks: list[ResourceBlock]
    actor_id: str
    is_admin: bool = False


@dataclass(frozen=True, slots=True)
class FeedbackInput:
    user_id: str | None
    ova_id: str
    fase_id: str | None
    instruccion: str | None
    bloques_antes: list[dict[str, Any]]
    intencion_propuesta: dict[str, Any] | None
    intencion_final: dict[str, Any] | None
    resultado: str
    confianza: float | None = None
    backend: str | None = None
    motivo_rechazo: str | None = None
