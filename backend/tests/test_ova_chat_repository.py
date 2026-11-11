"""Historial del chat del editor: devuelve los mensajes más recientes en orden."""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

from models import Ova, OvaEditorChatMessage, User
from ova.infrastructure.sqlalchemy_chat_repository import SqlAlchemyChatRepository
from tests._sqlite_db import make_session


def test_list_messages_returns_latest_in_chronological_order():
    db = make_session(User.__table__, Ova.__table__, OvaEditorChatMessage.__table__)
    user = User(id=uuid.uuid4(), email="ana@upao.edu.pe", password_hash="x", is_active=True)
    ova = Ova(id=uuid.uuid4(), user_id=user.id, title="Fotosíntesis", status="listo")
    db.add_all([user, ova])
    db.flush()
    start = datetime(2026, 10, 1, tzinfo=UTC)
    db.add_all(
        OvaEditorChatMessage(
            ova_id=ova.id,
            user_id=user.id,
            role="user",
            text=f"mensaje {number}",
            created_at=start + timedelta(minutes=number),
        )
        for number in range(1, 206)
    )
    db.commit()

    messages = SqlAlchemyChatRepository(db).list_messages(ova.id)

    assert len(messages) == 200
    assert messages[0].text == "mensaje 6"
    assert messages[-1].text == "mensaje 205"
    assert [m.created_at for m in messages] == sorted(m.created_at for m in messages)
    db.close()
