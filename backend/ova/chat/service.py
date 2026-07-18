"""Persist and list editor chat messages for an OVA."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ova.chat.models import OvaEditorChatMessage


def message_to_dict(row: OvaEditorChatMessage) -> dict[str, Any]:
    labels = row.resource_labels if isinstance(row.resource_labels, list) else []
    return {
        "id": str(row.id),
        "role": row.role,
        "kind": row.kind,
        "text": row.text or "",
        "status": row.status,
        "percentage": row.percentage,
        "resource_labels": labels,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def list_messages(db: Session, ova_id: str, limit: int = 200) -> list[dict[str, Any]]:
    rows = (
        db.execute(
            select(OvaEditorChatMessage)
            .where(OvaEditorChatMessage.ova_id == ova_id)
            .order_by(OvaEditorChatMessage.created_at.asc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
    return [message_to_dict(r) for r in rows]


def create_message(
    db: Session,
    *,
    ova_id: str,
    user_id: str,
    role: str,
    kind: str,
    text: str,
    status: str | None = None,
    percentage: int | None = None,
    resource_labels: list[str] | None = None,
    message_id: str | None = None,
) -> OvaEditorChatMessage:
    try:
        pk = uuid.UUID(message_id) if message_id else uuid.uuid4()
    except (ValueError, TypeError):
        pk = uuid.uuid4()
    row = OvaEditorChatMessage(
        id=pk,
        ova_id=uuid.UUID(ova_id),
        user_id=uuid.UUID(user_id),
        role=role,
        kind=kind or "message",
        text=text or "",
        status=status,
        percentage=percentage,
        resource_labels=list(resource_labels or []),
    )
    db.add(row)
    return row


def update_message(
    db: Session,
    *,
    ova_id: str,
    message_id: str,
    text: str | None = None,
    status: str | None = None,
    percentage: int | None = None,
    resource_labels: list[str] | None = None,
) -> OvaEditorChatMessage | None:
    row = db.execute(
        select(OvaEditorChatMessage).where(
            OvaEditorChatMessage.id == message_id,
            OvaEditorChatMessage.ova_id == ova_id,
        )
    ).scalar_one_or_none()
    if not row:
        return None
    if text is not None:
        row.text = text
    if status is not None:
        row.status = status
    if percentage is not None:
        row.percentage = percentage
    if resource_labels is not None:
        row.resource_labels = list(resource_labels)
    return row
