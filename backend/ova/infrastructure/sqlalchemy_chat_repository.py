"""Persistencia SQLAlchemy del chat del editor. No importa `ova.application`."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import OvaEditorChatMessage
from ova.domain.chat import ChatMessage, ChatMessageDraft, ChatMessagePatch


def _labels(value: object) -> tuple[str, ...]:
    if isinstance(value, list):
        return tuple(str(item) for item in value)
    return ()


def _to_message(row: OvaEditorChatMessage) -> ChatMessage:
    return ChatMessage(
        id=str(row.id),
        role=str(row.role),
        kind=str(row.kind),
        text=row.text or "",
        status=row.status,
        percentage=row.percentage,
        resource_labels=_labels(row.resource_labels),
        created_at=row.created_at,
    )


class SqlAlchemyChatRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_messages(self, ova_id: str, limit: int = 200) -> tuple[ChatMessage, ...]:
        rows = (
            self._db.execute(
                select(OvaEditorChatMessage)
                .where(OvaEditorChatMessage.ova_id == ova_id)
                .order_by(OvaEditorChatMessage.created_at.asc())
                .limit(limit)
            )
            .scalars()
            .all()
        )
        return tuple(_to_message(row) for row in rows)

    def create_message(self, draft: ChatMessageDraft) -> ChatMessage:
        try:
            pk = uuid.UUID(draft.message_id) if draft.message_id else uuid.uuid4()
        except (ValueError, TypeError):
            pk = uuid.uuid4()
        row = OvaEditorChatMessage(
            id=pk,
            ova_id=uuid.UUID(draft.ova_id),
            user_id=uuid.UUID(draft.user_id),
            role=draft.role,
            kind=draft.kind or "message",
            text=draft.text or "",
            status=draft.status,
            percentage=draft.percentage,
            resource_labels=list(draft.resource_labels),
        )
        self._db.add(row)
        commit_or_500(self._db, "save_chat_message")
        self._db.refresh(row)
        return _to_message(row)

    def update_message(self, patch: ChatMessagePatch) -> ChatMessage | None:
        row = self._db.execute(
            select(OvaEditorChatMessage).where(
                OvaEditorChatMessage.id == patch.message_id,
                OvaEditorChatMessage.ova_id == patch.ova_id,
            )
        ).scalar_one_or_none()
        if not row:
            return None
        if patch.text is not None:
            row.text = patch.text
        if patch.status is not None:
            row.status = patch.status
        if patch.percentage is not None:
            row.percentage = patch.percentage
        if patch.resource_labels is not None:
            row.resource_labels = list(patch.resource_labels)
        commit_or_500(self._db, "update_chat_message")
        self._db.refresh(row)
        return _to_message(row)

    def delete_message(self, ova_id: str, message_id: str) -> bool:
        row = self._db.execute(
            select(OvaEditorChatMessage).where(
                OvaEditorChatMessage.id == message_id,
                OvaEditorChatMessage.ova_id == ova_id,
            )
        ).scalar_one_or_none()
        if not row:
            return False
        self._db.delete(row)
        commit_or_500(self._db, "delete_chat_message")
        return True

    def clear_messages(self, ova_id: str) -> int:
        rows = (
            self._db.execute(select(OvaEditorChatMessage).where(OvaEditorChatMessage.ova_id == ova_id))
            .scalars()
            .all()
        )
        for row in rows:
            self._db.delete(row)
        commit_or_500(self._db, "clear_chat_messages")
        return len(rows)
