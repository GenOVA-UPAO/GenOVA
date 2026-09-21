"""Regresión: la regeneración no puede cambiar el tema del OVA.

El botón «Regenerar OVA completo» mandaba su propia etiqueta como prompt y el
router, sin recursos seleccionados, la tomaba como el tema nuevo: el OVA de la
Ley de Ohm acabó tratando sobre cómo regenerar un OVA. La versión creada
guardaba ese tema falso, así que toda regeneración posterior heredaba el daño.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from generation.regen import regen_router  # noqa: E402
from models import Ova, OvaPhase, OvaVersion  # noqa: E402

TOPIC = "Ley de Ohm y análisis de circuitos en serie y paralelo"
POISONED = "Regenerar OVA completo"

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
"""


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    db = sessionmaker(bind=engine, future=True)()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def _seed(session, *, poisoned: bool) -> Ova:
    """OVA de la Ley de Ohm; con `poisoned`, su v2 activa guarda el tema falso."""
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title=TOPIC, status="listo")
    session.add(ova)
    v1 = OvaVersion(
        id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt=TOPIC, is_active=not poisoned
    )
    session.add(v1)
    active = v1
    if poisoned:
        active = OvaVersion(
            id=uuid.uuid4(), ova_id=ova.id, version_number=2, prompt=POISONED, is_active=True
        )
        session.add(active)
    session.add(
        OvaPhase(
            id=uuid.uuid4(),
            version_id=active.id,
            phase_type="engage",
            phase_order=1,
            content="<html></html>",
        )
    )
    session.commit()
    return ova


def test_original_topic_ignores_a_poisoned_active_version(session):
    ova = _seed(session, poisoned=True)
    assert regen_router._original_topic(ova.id, POISONED, session) == TOPIC


def test_original_topic_falls_back_without_versions(session):
    assert regen_router._original_topic(uuid.uuid4(), "respaldo", session) == "respaldo"


def _regen(session, monkeypatch, ova, payload):
    """Llama al endpoint saltándose el rate limit y captura lo que se encola."""
    started = {}

    def fake_start_regen(db, ova_, prompt, fase_ids, total, *, worker, instruction):
        started.update(prompt=prompt, fase_ids=fase_ids, instruction=instruction)
        return "job-1"

    monkeypatch.setattr(regen_router, "start_regen", fake_start_regen)
    monkeypatch.setattr(regen_router, "is_ova_owner", lambda *_: True)
    endpoint = regen_router.regenerate_ova.__wrapped__
    response = endpoint(
        request=None, ova_id=ova.id, payload=payload, current_user=object(), db=session
    )
    assert response.status_code == 202
    return started


def test_full_regen_button_keeps_the_topic(session, monkeypatch):
    """Contrato del botón: sin mensaje, se regenera sobre el tema original.

    El backend ya lo cumplía cuando le llegaba el prompt vacío; el fallo de la
    captura era que el frontend mandaba la etiqueta del botón. Ese caso —un
    texto sin recursos seleccionados— lo cubre el test siguiente.
    """
    ova = _seed(session, poisoned=False)
    started = _regen(session, monkeypatch, ova, regen_router.RegenRequest(prompt=""))
    assert started["prompt"] == TOPIC
    assert started["instruction"] is None


def test_message_without_selection_is_an_instruction_not_a_topic(session, monkeypatch):
    """Antes, un mensaje sin recursos seleccionados sustituía al tema."""
    ova = _seed(session, poisoned=False)
    payload = regen_router.RegenRequest(prompt="Mejóralo")
    started = _regen(session, monkeypatch, ova, payload)
    assert started["prompt"] == TOPIC
    assert started["instruction"] == "Mejóralo"
    assert started["fase_ids"] == []


def test_regen_heals_an_ova_whose_active_version_was_poisoned(session, monkeypatch):
    """Los OVAs dañados antes del arreglo se curan en su siguiente regeneración."""
    ova = _seed(session, poisoned=True)
    started = _regen(session, monkeypatch, ova, regen_router.RegenRequest(prompt=""))
    assert started["prompt"] == TOPIC
