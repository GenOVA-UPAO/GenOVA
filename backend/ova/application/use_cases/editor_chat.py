"""Caso de uso: historial de chat del editor de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import ChatAccessInput, ChatCreateInput, ChatPatchInput
from ova.application.ports import ChatRepository, OvaEditorRepository
from ova.domain.chat import (
    CHAT_ROLES,
    CHAT_STATUSES,
    ChatMessage,
    ChatMessageDraft,
    ChatMessagePatch,
)
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound
from ova.domain.model import OvaActor


@dataclass(frozen=True, slots=True)
class EditorChat:
    editor: OvaEditorRepository
    chat: ChatRepository

    def list(self, data: ChatAccessInput) -> tuple[ChatMessage, ...]:
        self._require(data.ova_id, data.actor)
        return self.chat.list_messages(data.ova_id)

    def create(self, data: ChatCreateInput) -> ChatMessage:
        self._require(data.ova_id, data.actor)
        if data.role not in CHAT_ROLES:
            raise OvaEditError(400, "invalid_role", "Rol de mensaje no válido.")
        if data.status and data.status not in CHAT_STATUSES:
            raise OvaEditError(400, "invalid_status", "Estado de mensaje no válido.")
        return self.chat.create_message(
            ChatMessageDraft(
                ova_id=data.ova_id,
                user_id=data.actor.id,
                role=data.role,
                kind=data.kind[:40],
                text=data.text[:8000],
                status=data.status,
                percentage=data.percentage,
                resource_labels=tuple(data.resource_labels[:20]),
                message_id=data.message_id,
            )
        )

    def patch(self, data: ChatPatchInput) -> ChatMessage:
        self._require(data.ova_id, data.actor)
        if data.status and data.status not in CHAT_STATUSES:
            raise OvaEditError(400, "invalid_status", "Estado de mensaje no válido.")
        updated = self.chat.update_message(
            ChatMessagePatch(
                ova_id=data.ova_id,
                message_id=data.message_id,
                text=data.text[:8000] if data.text is not None else None,
                status=data.status,
                percentage=data.percentage,
                resource_labels=data.resource_labels,
            )
        )
        if updated is None:
            raise OvaEditError(404, "not_found", "Mensaje no encontrado.")
        return updated

    def delete(self, data: ChatPatchInput) -> None:
        self._require(data.ova_id, data.actor)
        if not self.chat.delete_message(data.ova_id, data.message_id):
            raise OvaEditError(404, "not_found", "Mensaje no encontrado.")

    def clear(self, data: ChatAccessInput) -> int:
        self._require(data.ova_id, data.actor)
        return self.chat.clear_messages(data.ova_id)

    def _require(self, ova_id: str, actor: OvaActor) -> None:
        ova = self.editor.get_ova(ova_id)
        if ova is None:
            raise OvaNotFound("OVA no encontrado.")
        if ova.owner_id != actor.id and not actor.is_admin:
            raise OvaForbidden("Sin permisos.")
