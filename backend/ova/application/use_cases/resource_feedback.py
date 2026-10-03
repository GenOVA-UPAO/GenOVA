"""Caso de uso: valoración 👍/👎 del docente sobre un recurso de su OVA."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ova.application.ports import FeedbackRepository, OvaEditorRepository
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound
from ova.domain.feedback import (
    COMMENT_MAX,
    RATINGS,
    REASONS,
    ResourceFeedback,
    ResourceFeedbackDraft,
)
from ova.domain.model import EDIT_FORBIDDEN, OvaActor, can_edit_ova

# html -> {"key": ..., "params": {...}}; lo inyecta el container (ova no conoce el motor).
EngineInfoReader = Callable[[str], dict]


@dataclass(frozen=True, slots=True)
class FeedbackInput:
    ova_id: str
    phase_id: str
    actor: OvaActor
    rating: str = ""
    reason: str | None = None
    comment: str | None = None


@dataclass(frozen=True, slots=True)
class ResourceFeedbackUseCase:
    editor: OvaEditorRepository
    feedback: FeedbackRepository
    read_engine_info: EngineInfoReader

    def _require_owner(self, ova_id: str, actor: OvaActor):
        ova = self.editor.get_ova(ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if not can_edit_ova(ova.owner_id, actor):
            raise OvaForbidden(EDIT_FORBIDDEN)
        return ova

    def put(self, data: FeedbackInput) -> ResourceFeedback:
        """Idempotente por (usuario, recurso): valorar de nuevo actualiza."""
        if data.rating not in RATINGS:
            raise OvaEditError(400, "invalid_rating", "La valoración debe ser «up» o «down».")
        reason = data.reason or None
        if data.rating == "down" and reason is not None and reason not in REASONS:
            raise OvaEditError(400, "invalid_reason", "Motivo no válido.")
        if data.rating == "up":
            reason = None
        comment = (data.comment or "").strip() or None
        if comment and len(comment) > COMMENT_MAX:
            raise OvaEditError(400, "comment_too_long", f"El comentario admite hasta {COMMENT_MAX} caracteres.")
        if data.rating == "up":
            comment = None
        ova = self._require_owner(data.ova_id, data.actor)
        active = self.editor.get_or_create_active_version(ova)
        phase = self.editor.get_phase(data.phase_id, active.id)
        if phase is None:
            raise OvaEditError(404, "phase_not_found", "Recurso no encontrado en la versión activa.")
        info = self.read_engine_info(phase.content)
        return self.feedback.upsert(
            ResourceFeedbackDraft(
                user_id=data.actor.id,
                ova_id=data.ova_id,
                phase_id=data.phase_id,
                phase=phase.phase_type,
                resource_type=str(phase.resource_type_id) if phase.resource_type_id is not None else None,
                template_key=info.get("key"),
                params=info.get("params") or {},
                rating=data.rating,
                reason=reason,
                comment=comment,
            )
        )

    def list(self, data: FeedbackInput) -> tuple[ResourceFeedback, ...]:
        self._require_owner(data.ova_id, data.actor)
        return self.feedback.list_for_ova(data.actor.id, data.ova_id)

    def delete(self, data: FeedbackInput) -> None:
        self._require_owner(data.ova_id, data.actor)
        if not self.feedback.delete(data.actor.id, data.phase_id):
            raise OvaEditError(404, "not_found", "Valoración no encontrada.")
