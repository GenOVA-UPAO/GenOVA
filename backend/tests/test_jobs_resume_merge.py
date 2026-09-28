"""Reintentar recursos fallidos de un job `done` los añade al OVA ya creado.

Antes el reintento marcaba el recurso `done` en el job pero el OVA (ya «listo»)
no cambiaba: solo se materializaba un OVA atascado en «generando». SQLite en
memoria, sin red; el SCORM se sustituye.
"""

import os
import sys
import uuid
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from generation.jobs import jobs_resume_merge  # noqa: E402
from generation.jobs.jobs_resume_merge import merge_resumed_resources  # noqa: E402
from models import Ova, OvaJobResource, OvaPhase, OvaPhaseVersion, OvaVersion  # noqa: E402


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://")
    for model in (Ova, OvaVersion, OvaPhase, OvaPhaseVersion, OvaJobResource):
        model.__table__.create(engine)
    # SQLite ignora el postgresql_where del índice parcial: se recrea como parcial
    # (una sola versión ACTIVA por OVA), igual que en Postgres.
    with engine.begin() as conn:
        conn.execute(text("DROP INDEX uq_one_active_version_per_ova"))
        conn.execute(
            text(
                "CREATE UNIQUE INDEX uq_one_active_version_per_ova "
                "ON ova_versions (ova_id) WHERE is_active"
            )
        )
    scorms: list[list[dict]] = []
    monkeypatch.setattr(
        jobs_resume_merge, "_persist_scorm", lambda _ova, _t, phases, _u: scorms.append(phases)
    )
    session = sessionmaker(bind=engine)()
    session.scorms = scorms
    yield session
    session.close()


def _ova_con_version(db, status="listo"):
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Fotosíntesis", status=status)
    db.add(ova)
    db.flush()
    v = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=2, prompt="", is_active=True)
    db.add(v)
    db.flush()
    db.add(
        OvaPhase(
            version_id=v.id,
            phase_type="engage",
            phase_order=1,
            content="<p>editado por el docente</p>",
            regenerated=True,
            resource_type_id=5,
            title="Dilema ético",
        )
    )
    db.add(
        OvaPhase(
            version_id=v.id,
            phase_type="evaluate",
            phase_order=2,
            content="<p>quiz</p>",
            resource_type_id=1,
            title="Quiz",
        )
    )
    ova.current_version_id = v.id
    db.commit()
    return ova


def _recurso(db, job, status, phase="explore", content="<p>lectura</p>"):
    r = OvaJobResource(
        id=uuid.uuid4(),
        job_id=job.id,
        phase_type=phase,
        phase_order=2,
        resource_type="5",
        resource_order=0,
        status=status,
        content=content,
    )
    db.add(r)
    db.commit()
    return r


def _job(ova):
    return SimpleNamespace(id=uuid.uuid4(), ova_id=ova.id, user_id=ova.user_id)


def test_el_recurso_recuperado_entra_en_una_version_nueva_sin_perder_ediciones(db):
    ova = _ova_con_version(db)
    job = _job(ova)
    recuperado = _recurso(db, job, "done")

    assert merge_resumed_resources(db, job, [recuperado.id]) is True

    versiones = db.execute(select(OvaVersion).where(OvaVersion.ova_id == ova.id)).scalars().all()
    activa = [v for v in versiones if v.is_active]
    assert len(versiones) == 2 and len(activa) == 1
    assert activa[0].version_number == 3
    assert ova.current_version_id == activa[0].id
    fases = sorted(activa[0].phases, key=lambda p: p.phase_order)
    # Orden 5E: la exploración recuperada va entre enganche y evaluación.
    assert [(p.phase_type, p.content) for p in fases] == [
        ("engage", "<p>editado por el docente</p>"),
        ("explore", "<p>lectura</p>"),
        ("evaluate", "<p>quiz</p>"),
    ]
    assert fases[1].title  # etiqueta legible del tipo de recurso
    assert [p["type"] for p in db.scorms[0]] == ["engage", "explore", "evaluate"]


def test_sin_recursos_recuperados_no_crea_version(db):
    ova = _ova_con_version(db)
    job = _job(ova)
    sigue_fallando = _recurso(db, job, "error", content="")

    assert merge_resumed_resources(db, job, [sigue_fallando.id]) is False
    assert len(db.execute(select(OvaVersion)).scalars().all()) == 1
    assert db.scorms == []


def test_ova_atascado_en_generando_lo_resuelve_la_materializacion(db):
    ova = _ova_con_version(db, status="generando")
    job = _job(ova)
    recuperado = _recurso(db, job, "done")

    assert merge_resumed_resources(db, job, [recuperado.id]) is False
    assert len(db.execute(select(OvaVersion)).scalars().all()) == 1
