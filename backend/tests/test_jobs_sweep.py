"""GN-03 — sweep de jobs zombis: "queued" estancado y barrido por listado.

Regresión de la auditoría 2026-07-16: `_sweep_if_stale` solo cubría jobs
"running" y solo se ejecutaba cuando el dueño consultaba ese job exacto, así
que un job encolado sin worker (o cuyo dueño nunca volvía a abrir la vista)
quedaba "generando" para siempre — 71% de los OVAs de la BD estaban zombis.

SQLite in-memory con DDL manual (mismo patrón que test_c14_orm_delete_cascade).

Uso:  pytest tests/test_jobs_sweep.py -v
"""

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from generation.jobs import jobs_service  # noqa: E402
from models import Ova, OvaJob, OvaJobResource  # noqa: E402

_DDL = """
CREATE TABLE ovas (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador', file_path TEXT, storage_key TEXT,
  current_version_id TEXT, deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE ova_jobs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ova_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  prompt TEXT NOT NULL DEFAULT '', params TEXT NOT NULL DEFAULT '{}',
  rag_context TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP, finished_at TIMESTAMP
);
CREATE TABLE ova_job_resources (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES ova_jobs(id) ON DELETE CASCADE,
  phase_type VARCHAR(30) NOT NULL, phase_order INTEGER NOT NULL,
  resource_type VARCHAR(40), resource_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_id TEXT, ova_phase_id TEXT, content TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        for stmt in _DDL.split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def _mk_job(db, *, status: str, age_seconds: int, ova_status: str = "generando"):
    """Crea ova + job + 1 recurso pending, con updated_at retrocedido age_seconds."""
    uid = uuid.uuid4()
    ova = Ova(id=uuid.uuid4(), user_id=uid, title="OVA test", status=ova_status)
    db.add(ova)
    job = OvaJob(id=uuid.uuid4(), user_id=uid, ova_id=ova.id, status=status, params={})
    db.add(job)
    db.add(
        OvaJobResource(
            id=uuid.uuid4(),
            job_id=job.id,
            phase_type="engage",
            phase_order=1,
            resource_type="comic",
            status="pending",
        )
    )
    db.commit()
    stale_ts = datetime.now(UTC) - timedelta(seconds=age_seconds)
    # postgresql.UUID sobre SQLite persiste como hex sin guiones — usar .hex.
    db.execute(
        text("UPDATE ova_jobs SET updated_at = :ts WHERE id = :id"),
        {"ts": stale_ts, "id": job.id.hex},
    )
    db.commit()
    db.expire_all()
    return job.id, ova.id


def _reload(db, model, pk):
    return db.get(model, pk)


def test_queued_estancado_se_marca_interrupted(db):
    job_id, ova_id = _mk_job(
        db, status="queued", age_seconds=jobs_service.QUEUED_STALE_AFTER_SECONDS + 60
    )
    job = _reload(db, OvaJob, job_id)
    jobs_service._sweep_if_stale(db, job)
    assert _reload(db, OvaJob, job_id).status == "interrupted"
    assert _reload(db, Ova, ova_id).status != "generando"


def test_queued_fresco_no_se_toca(db):
    job_id, ova_id = _mk_job(db, status="queued", age_seconds=10)
    job = _reload(db, OvaJob, job_id)
    jobs_service._sweep_if_stale(db, job)
    assert _reload(db, OvaJob, job_id).status == "queued"
    assert _reload(db, Ova, ova_id).status == "generando"


def test_running_estancado_se_marca_interrupted(db):
    job_id, _ = _mk_job(db, status="running", age_seconds=jobs_service.STALE_AFTER_SECONDS + 60)
    job = _reload(db, OvaJob, job_id)
    jobs_service._sweep_if_stale(db, job)
    assert _reload(db, OvaJob, job_id).status == "interrupted"


def test_sweep_por_listado_barre_varios_ovas(db):
    stale_q, ova_q = _mk_job(
        db, status="queued", age_seconds=jobs_service.QUEUED_STALE_AFTER_SECONDS + 60
    )
    stale_r, ova_r = _mk_job(
        db, status="running", age_seconds=jobs_service.STALE_AFTER_SECONDS + 60
    )
    fresh, ova_f = _mk_job(db, status="running", age_seconds=5)

    jobs_service.sweep_stale_jobs_for_ovas(db, [ova_q, ova_r, ova_f])

    assert _reload(db, OvaJob, stale_q).status == "interrupted"
    assert _reload(db, OvaJob, stale_r).status == "interrupted"
    assert _reload(db, OvaJob, fresh).status == "running"
    assert _reload(db, Ova, ova_f).status == "generando"


def test_sweep_por_listado_lista_vacia_no_falla(db):
    jobs_service.sweep_stale_jobs_for_ovas(db, [])
