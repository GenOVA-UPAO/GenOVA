"""Estado de las regeneraciones en la BD (tabla regen_jobs, migración 044).

Antes vivía en un dict de la memoria del proceso: el sondeo que caía en otro
worker daba 404, un arranque liberaba el OVA que otro proceso vivo regeneraba y
un reinicio dejaba el chat girando. Aquí dos «procesos» son dos valores de
`OWNER` sobre la misma base de datos (SQLite en memoria, sin red).
"""

import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, select, text, update  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from generation.regen import regen_jobs, regen_service  # noqa: E402
from generation.regen.regen_rag import RegenMaterial  # noqa: E402
from models import Ova, OvaPhase, OvaVersion, RegenJob  # noqa: E402

_DDL = """
CREATE TABLE ovas (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador', file_path TEXT, storage_key TEXT,
  current_version_id TEXT, deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE ova_versions (
  id TEXT PRIMARY KEY,
  ova_id TEXT NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_phases (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES ova_versions(id) ON DELETE CASCADE,
  phase_type VARCHAR(30) NOT NULL,
  phase_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  regenerated BOOLEAN NOT NULL DEFAULT 0,
  resource_type_id INTEGER,
  title VARCHAR(120),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_jobs (id TEXT PRIMARY KEY, ova_id TEXT, status VARCHAR(20) NOT NULL);
"""

OTHER = "otra-maquina:4242:deadbeef"


@pytest.fixture
def engine(monkeypatch):
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    RegenJob.__table__.create(eng)
    monkeypatch.setattr(regen_jobs, "_engine", lambda: eng)
    yield eng
    eng.dispose()


@pytest.fixture
def db(engine):
    session = sessionmaker(bind=engine, future=True)()
    yield session
    session.close()


def _seed(db, *, status="listo") -> Ova:
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Ley de Ohm", status=status)
    db.add(ova)
    v1 = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="Ley de Ohm")
    db.add(v1)
    db.add(
        OvaPhase(
            id=uuid.uuid4(),
            version_id=v1.id,
            phase_type="engage",
            phase_order=1,
            content="<html>v1</html>",
        )
    )
    db.flush()
    ova.current_version_id = v1.id
    db.commit()
    return ova


def _start(db, ova, launched=None) -> str:
    def worker(job_id, ova_id):
        if launched is not None:
            launched.append((job_id, ova_id))

    return regen_jobs.start_regen(db, ova, "Ley de Ohm", [], 1, worker, instruction="más ejemplos")


def _set(engine, job_id, **values):
    with engine.begin() as conn:
        conn.execute(
            update(RegenJob.__table__).where(RegenJob.id == uuid.UUID(job_id)).values(**values)
        )


def _ago(seconds: float) -> datetime:
    return datetime.now(UTC).replace(tzinfo=None) - timedelta(seconds=seconds)


def _ova_status(db, ova) -> str:
    db.expire_all()
    return db.execute(select(Ova.status).where(Ova.id == ova.id)).scalar_one()


def test_el_progreso_sale_de_la_bd_y_lo_sirve_cualquier_proceso(db, engine):
    ova = _seed(db)
    launched = []
    job_id = _start(db, ova, launched)

    # La fila existe en la misma transacción que pone el OVA en «generando».
    assert launched == [(job_id, str(ova.id))]
    assert _ova_status(db, ova) == "generando"
    dto = regen_jobs.regen_progress_dto(job_id, str(ova.id))
    assert dto["status"] == "running" and dto["job_id"] == job_id
    assert set(dto) == {
        "job_id",
        "ova_id",
        "status",
        "percentage",
        "stage",
        "new_version_number",
        "rag",
    }
    # De otro OVA, o un id malformado: como antes, «no encontrado».
    assert regen_jobs.regen_progress_dto(job_id, str(uuid.uuid4())) is None
    assert regen_jobs.regen_progress_dto("no-es-uuid", str(ova.id)) is None


def test_solo_un_proceso_la_reclama(db, engine, monkeypatch):
    ova = _seed(db)
    job_id = _start(db, ova)
    got = regen_jobs.claim_regen(job_id)
    assert got["instruction"] == "más ejemplos" and got["ova_id"] == ova.id
    monkeypatch.setattr(regen_jobs, "OWNER", OTHER)
    assert regen_jobs.claim_regen(job_id) is None  # p. ej. reintento de arq en otro worker
    assert regen_jobs.touch_regen(job_id) is False  # tampoco puede latir por la otra


def test_la_recuperacion_no_libera_la_regeneracion_de_otro_proceso_vivo(db, engine):
    ova = _seed(db)
    job_id = _start(db, ova)
    _set(engine, job_id, owner=OTHER, status="generating", heartbeat_at=_ago(5))

    assert regen_jobs.recover_orphan_regen() == 0
    assert _ova_status(db, ova) == "generando"
    assert regen_jobs.regen_progress_dto(job_id, str(ova.id))["status"] == "generating"


def test_sin_latido_se_interrumpe_y_libera_el_ova(db, engine):
    ova = _seed(db)
    job_id = _start(db, ova)
    _set(engine, job_id, owner=OTHER, status="generating", heartbeat_at=_ago(600))

    assert regen_jobs.recover_orphan_regen() == 1
    assert _ova_status(db, ova) == "listo"
    dto = regen_jobs.regen_progress_dto(job_id, str(ova.id))
    # El chat recibe un terminal «error» y deja de girar.
    assert dto["status"] == "error" and dto["percentage"] == 100
    row = db.get(RegenJob, uuid.UUID(job_id))
    assert row.step == "interrupted" and row.error == regen_jobs.INTERRUPTED_MSG


def test_el_sondeo_detecta_por_si_mismo_el_ejecutor_muerto(db, engine):
    ova = _seed(db)
    job_id = _start(db, ova)
    _set(engine, job_id, owner=OTHER, status="generating", heartbeat_at=_ago(600))

    assert regen_jobs.regen_progress_dto(job_id, str(ova.id))["status"] == "error"
    assert _ova_status(db, ova) == "listo"


def test_en_cola_sin_dueno_aguanta_mas_que_el_latido(db, engine):
    ova = _seed(db)
    job_id = _start(db, ova)
    _set(engine, job_id, heartbeat_at=_ago(regen_jobs.TTL_S * 3))  # esperando al worker

    assert regen_jobs.recover_orphan_regen() == 0
    assert _ova_status(db, ova) == "generando"
    _set(engine, job_id, heartbeat_at=_ago(regen_jobs.QUEUED_TTL_S + 60))
    assert regen_jobs.recover_orphan_regen() == 1
    assert _ova_status(db, ova) == "listo"


def test_ova_sin_fila_se_libera_salvo_job_de_generacion_activo(db, engine):
    ova = _seed(db, status="generando")  # p. ej. de una versión anterior en memoria
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO ova_jobs (id, ova_id, status) VALUES (:i, :o, 'running')"),
            {"i": uuid.uuid4().hex, "o": ova.id.hex},
        )
    assert regen_jobs.recover_orphan_regen() == 0
    with engine.begin() as conn:
        conn.execute(text("UPDATE ova_jobs SET status = 'done'"))
    assert regen_jobs.recover_orphan_regen(ova_id=ova.id) == 1
    assert _ova_status(db, ova) == "listo"


# ── Ejecutor (_finalize_edit) con el modelo simulado ──────────────────────────


@pytest.fixture
def executor(engine, monkeypatch):
    """Todo lo que sale de la máquina (LLM, RAG, SCORM) queda simulado."""
    calls = {}
    monkeypatch.setattr(regen_service, "SessionLocal", sessionmaker(bind=engine, future=True))
    monkeypatch.setattr(regen_service, "_owner_llm_config", lambda *_: {})
    monkeypatch.setattr(regen_service, "_owner_image_settings", lambda *_: {})
    monkeypatch.setattr(
        regen_service,
        "build_regen_material",
        lambda *_: RegenMaterial("ctx", {"status": "used", "sources": [], "attachments": []}),
    )

    def fake_regen(phases, *_args, **_kw):
        calls["regen"] = [str(p.id) for p in phases]
        if "during_llm" in calls:
            calls["during_llm"]()
        return {str(p.id): "<html>v2</html>" for p in phases}

    def fake_persist(ova, ova_id, new_version, version_num, phases_data, db):
        ova.status = "listo"
        ova.current_version_id = new_version.id
        db.commit()

    monkeypatch.setattr(regen_service, "regen_phases_parallel", fake_regen)
    monkeypatch.setattr(regen_service, "_build_and_persist", fake_persist)
    monkeypatch.setattr(regen_jobs, "RENEW_S", 3600.0)
    return calls


def test_el_ejecutor_escribe_version_y_cierra_la_fila(db, engine, executor):
    ova = _seed(db)
    job_id = _start(db, ova)
    regen_service._finalize_edit(job_id, str(ova.id))

    dto = regen_jobs.regen_progress_dto(job_id, str(ova.id))
    assert dto["status"] == "success" and dto["new_version_number"] == 2
    assert dto["rag"]["status"] == "used"
    assert _ova_status(db, ova) == "listo"
    # Un segundo lanzamiento (reintento de arq) no repite nada.
    regen_service._finalize_edit(job_id, str(ova.id))
    assert db.execute(select(OvaVersion).where(OvaVersion.ova_id == ova.id)).all().__len__() == 2


def test_si_otro_proceso_la_dio_por_interrumpida_no_escribe_version(db, engine, executor):
    ova = _seed(db)
    job_id = _start(db, ova)

    def interrupted_meanwhile():
        _set(engine, job_id, status="error", step="interrupted")
        with engine.begin() as conn:
            conn.execute(text("UPDATE ovas SET status = 'listo'"))

    executor["during_llm"] = interrupted_meanwhile
    regen_service._finalize_edit(job_id, str(ova.id))

    versions = db.execute(select(OvaVersion.version_number).where(OvaVersion.ova_id == ova.id))
    assert sorted(versions.scalars()) == [1]
    assert _ova_status(db, ova) == "listo"  # no la marca «error»: ya no era suya


def test_un_fallo_marca_error_en_la_fila_y_en_el_ova(db, engine, executor, monkeypatch):
    ova = _seed(db)
    job_id = _start(db, ova)

    def boom(*_a, **_k):
        raise RuntimeError("modelo caído")

    monkeypatch.setattr(regen_service, "regen_phases_parallel", boom)
    regen_service._finalize_edit(job_id, str(ova.id))

    dto = regen_jobs.regen_progress_dto(job_id, str(ova.id))
    assert dto["status"] == "error"
    assert _ova_status(db, ova) == "error"
    assert db.get(RegenJob, uuid.UUID(job_id)).error == "modelo caído"
