"""Políticas y vistas puras del chat del editor."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

CHAT_ROLES = frozenset({"user", "assistant", "system"})
CHAT_STATUSES = frozenset({"running", "success", "error"})


@dataclass(frozen=True, slots=True)
class ChatMessage:
    id: str
    role: str
    kind: str
    text: str
    status: str | None
    percentage: int | None
    resource_labels: tuple[str, ...]
    created_at: datetime | None


@dataclass(frozen=True, slots=True)
class ChatMessageDraft:
    ova_id: str
    user_id: str
    role: str
    kind: str
    text: str
    status: str | None
    percentage: int | None
    resource_labels: tuple[str, ...]
    message_id: str | None


@dataclass(frozen=True, slots=True)
class ChatMessagePatch:
    ova_id: str
    message_id: str
    text: str | None
    status: str | None
    percentage: int | None
    resource_labels: tuple[str, ...] | None
