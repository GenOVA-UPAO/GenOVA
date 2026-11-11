"""Reintentar un subconjunto siembra el grafo SOLO con esos recursos.

Antes `_generate` sembraba siempre todos los recursos de `params.resources` y
solo el motor falso (LLM_FAKE, el de CI) respetaba `only_resource_ids`: en
producción reintentar un recurso regeneraba el OVA entero (coste LLM x N) y
marcaba `done` recursos no pedidos que luego no entraban en el OVA.
SQLite en memoria; el grafo se sustituye.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from generation.jobs import jobs_runner  # noqa: E402
from models import OvaJob, OvaJobResource  # noqa: E402
from prometheus.engine.workpool import fan_out  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402

_PEDIDOS = [
    {"phase_type": "engage", "resource_type": "1"},
    {"phase_type": "explore", "resource_type": "5"},
    {"phase_type": "explain", "resource_type": "3"},
]


@pytest.fixture
def db(monkeypatch):
    session = make_session(OvaJob.__table__, OvaJobResource.__table__)
    monkeypatch.setattr(jobs_runner, "SessionLocal", sessionmaker(bind=session.bind))
    yield session
    session.close()


@pytest.fixture
def estados(monkeypatch):
    capturados: list[dict] = []

    def _invoke(state, _thread_id):
        capturados.append(state)
        return [], []

    monkeypatch.setattr(jobs_runner, "invoke_generation", _invoke)
    return capturados


def _job_con_recursos(db) -> tuple[OvaJob, dict[str, OvaJobResource]]:
    job = OvaJob(
        id=uuid.uuid4(), user_id=uuid.uuid4(), status="running", prompt="p",
        params={"resources": _PEDIDOS},
    )
    db.add(job)
    filas = {}
    estados_fila = {"engage": "done", "explore": "error", "explain": "error"}
    for order, pedido in enumerate(_PEDIDOS):
        fase = pedido["phase_type"]
        filas[fase] = OvaJobResource(
            id=uuid.uuid4(),
            job_id=job.id,
            phase_type=fase,
            phase_order=order,
            resource_type=pedido["resource_type"],
            resource_order=0,
            status=estados_fila[fase],
        )
        db.add(filas[fase])
    db.commit()
    return job, filas


def test_reintentar_un_recurso_solo_siembra_ese_recurso(db, estados):
    job, filas = _job_con_recursos(db)

    jobs_runner._generate(job.id, "p", dict(job.params), [filas["explore"].id])

    (state,) = estados
    assert state["phases"] == {"explore": [{"resource_type": 5, "resource_order": 0}]}
    assert state["phase_order"] == ["explore"]
    # El motor real (workpool) emite un único worker: el del recurso pedido.
    sends = fan_out({**state, "intentions": []})
    assert [s.arg["work_item"]["phase"] for s in sends] == ["explore"]


def test_sin_subconjunto_siembra_todos_los_recursos_pedidos(db, estados):
    job, _ = _job_con_recursos(db)

    jobs_runner._generate(job.id, "p", dict(job.params), None)

    assert estados[0]["phase_order"] == ["engage", "explore", "explain"]


def test_un_subconjunto_que_ya_no_existe_no_invoca_el_grafo(db, estados):
    job, _ = _job_con_recursos(db)

    assert jobs_runner._generate(job.id, "p", dict(job.params), [uuid.uuid4()]) == ([], [])
    assert estados == []
