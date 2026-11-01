"""Arranque del worker: no se re-encolan los jobs `queued`.

Un job solo queda `queued` cuando su entrada de arq ya está en Redis (que
sobrevive al reinicio del worker). `resume_orphans` los volvía a encolar con un
id nuevo: el mismo job corría dos veces, se pagaban dos veces las llamadas LLM
y el segundo run duplicaba todos los recursos en el OVA. SQLite en memoria.
"""

import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

import core.database  # noqa: E402
import worker  # noqa: E402
from models import OvaJob, OvaJobResource  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402


@pytest.fixture
def db(monkeypatch):
    session = make_session(OvaJob.__table__, OvaJobResource.__table__)
    monkeypatch.setattr(core.database, "SessionLocal", sessionmaker(bind=session.bind))
    yield session
    session.close()


def _job_en_cola(db) -> OvaJob:
    hace_poco = datetime.now(UTC) - timedelta(seconds=10)
    job = OvaJob(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        status="queued",
        prompt="Fotosíntesis",
        params={},
        created_at=hace_poco,
        updated_at=hace_poco,
    )
    db.add(job)
    for order, phase in enumerate(("engage", "explore")):
        db.add(
            OvaJobResource(
                id=uuid.uuid4(),
                job_id=job.id,
                phase_type=phase,
                phase_order=order,
                resource_type="5",
                resource_order=0,
                status="pending",
            )
        )
    db.commit()
    return job


def test_un_job_en_cola_reciente_no_se_reencola(db):
    _job_en_cola(db)

    assert worker._find_orphans_to_requeue() == []


def test_el_arranque_del_worker_no_encola_otra_vez_un_job_en_cola(db, monkeypatch):
    _job_en_cola(db)
    monkeypatch.setattr(worker, "_start_late_videos", lambda: None)
    monkeypatch.setattr(worker, "_recover_regen", lambda: None)
    redis = AsyncMock()

    asyncio.run(worker.resume_orphans({"redis": redis}))

    redis.enqueue_job.assert_not_called()
