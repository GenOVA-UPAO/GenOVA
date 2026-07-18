"""ORM for workspace editor chat history (per OVA)."""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base


class OvaEditorChatMessage(Base):
    __tablename__ = "ova_editor_chat_messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    ova_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ovas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)
    kind = Column(String(40), nullable=False, default="message", server_default="message")
    text = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=True)
    percentage = Column(Integer, nullable=True)
    resource_labels = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
