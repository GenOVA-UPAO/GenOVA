"""Regresión: el historial de micro-versiones de un recurso sobrevive a cada guardado.

Cada guardado crea una versión nueva con filas de fase nuevas (otro id). Antes
la micro-versión se colgaba del id nuevo y «Historial del recurso» solo veía la
última entrada: «Restaurar» nunca podía volver a una edición anterior. Además el
recurso editado se buscaba solo por phase_order, que se repite entre tipos 5E.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import Uuid, create_engine, select, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import Ova, OvaPhase, OvaVersion  # noqa: E402
from ova.application.dto import PhaseContentInput, PhaseVersionInput  # noqa: E402
from ova.application.use_cases.edit_phases import EditPhases  # noqa: E402
from ova.application.use_cases.phase_versions import PhaseVersions  # noqa: E402
from ova.domain.model import OvaActor  # noqa: E402
from ova.infrastructure.sqlalchemy_editor_repository import (  # noqa: E402
    SqlAlchemyOvaEditorRepository,
)

_DDL = """
CREATE TABLE ovas (
  license TEXT NOT NULL DEFAULT 'CC BY-SA 4.0', language TEXT NOT NULL DEFAULT 'es',
  keywords JSON NOT NULL DEFAULT '[]', educational_level TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '', typical_learning_time TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '', package_theme VARCHAR(24) NOT NULL DEFAULT 'upao',
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'borrador', file_path TEXT, storage_key TEXT,
  current_version_id TEXT, deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE ova_versions (
  id TEXT PRIMARY KEY, ova_id TEXT NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL, prompt TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_phases (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES ova_versions(id) ON DELETE CASCADE,
  phase_type VARCHAR(30) NOT NULL, phase_order INTEGER NOT NULL, content TEXT NOT NULL,
  regenerated BOOLEAN NOT NULL DEFAULT 0, resource_type_id INTEGER, title VARCHAR(120),
  lineage_id TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE ova_phase_versions (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL REFERENCES ova_phases(id) ON DELETE CASCADE,
  ova_id TEXT NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
  minor_number INTEGER NOT NULL DEFAULT 1, content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


def _uuid_bind_accepting_str(original):
    """En PostgreSQL los ids llegan como texto; SQLite (sin UUID nativo) no los
    convierte. Se aceptan aquí para ejercitar los casos de uso tal cual."""

    def bind_processor(self, dialect):
        process = original(self, dialect)
        if process is None:
            return None
        return lambda value: process(uuid.UUID(value) if isinstance(value, str) else value)

    return bind_processor


@pytest.fixture
def session(monkeypatch):
    monkeypatch.setattr(Uuid, "bind_processor", _uuid_bind_accepting_str(Uuid.bind_processor))
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


@pytest.fixture
def repo(session, monkeypatch):
    # El zip SCORM no es objeto de esta prueba.
    monkeypatch.setattr(SqlAlchemyOvaEditorRepository, "rebuild_scorm", lambda *a, **k: None)
    return SqlAlchemyOvaEditorRepository(session)


def _seed(session):
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Fotosíntesis", status="listo")
    session.add(ova)
    session.flush()
    version = OvaVersion(
        id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="p", is_active=True
    )
    session.add(version)
    session.flush()
    # Mismo phase_order en dos tipos 5E: el orden solo es único dentro de un tipo.
    for phase_type in ("engage", "explore"):
        session.add(
            OvaPhase(
                id=uuid.uuid4(),
                version_id=version.id,
                phase_type=phase_type,
                phase_order=1,
                content=f"<p>{phase_type} v1</p>",
                regenerated=False,
            )
        )
    ova.current_version_id = version.id
    session.commit()
    return ova


def _active_phase(session, ova_id, phase_type):
    return session.execute(
        select(OvaPhase)
        .join(OvaVersion, OvaVersion.id == OvaPhase.version_id)
        .where(
            OvaVersion.ova_id == ova_id,
            OvaVersion.is_active.is_(True),
            OvaPhase.phase_type == phase_type,
        )
    ).scalar_one()


def _save(repo, session, ova, phase_type, content):
    phase = _active_phase(session, ova.id, phase_type)
    actor = OvaActor(id=str(ova.user_id), is_admin=False)
    EditPhases(repo).save(
        PhaseContentInput(ova_id=str(ova.id), phase_id=str(phase.id), actor=actor, content=content)
    )


def _history(repo, session, ova, phase_type):
    phase = _active_phase(session, ova.id, phase_type)
    actor = OvaActor(id=str(ova.user_id), is_admin=False)
    data = PhaseVersionInput(ova_id=str(ova.id), phase_id=str(phase.id), actor=actor)
    return PhaseVersions(repo).list(data)["micro_versions"]


def test_historial_del_recurso_acumula_los_guardados(session, repo):
    ova = _seed(session)
    for n in (1, 2, 3):
        _save(repo, session, ova, "explore", f"<p>explore edición {n}</p>")
    # Guardar otro recurso también copia todas las fases con id nuevo.
    _save(repo, session, ova, "engage", "<p>engage edición 1</p>")

    explore = _history(repo, session, ova, "explore")
    assert [item["minor_number"] for item in explore] == [3, 2, 1]
    assert explore[-1]["content"] == "<p>explore edición 1</p>"
    engage = _history(repo, session, ova, "engage")
    assert [item["content"] for item in engage] == ["<p>engage edición 1</p>"]


def test_restaurar_una_edicion_anterior_desde_la_fase_actual(session, repo):
    ova = _seed(session)
    _save(repo, session, ova, "explore", "<p>primera</p>")
    _save(repo, session, ova, "explore", "<p>segunda</p>")
    first = _history(repo, session, ova, "explore")[-1]

    phase = _active_phase(session, ova.id, "explore")
    actor = OvaActor(id=str(ova.user_id), is_admin=False)
    PhaseVersions(repo).revert(
        PhaseVersionInput(
            ova_id=str(ova.id),
            phase_id=str(phase.id),
            actor=actor,
            micro_version_id=first["id"],
        )
    )
    session.expire_all()
    assert _active_phase(session, ova.id, "explore").content == "<p>primera</p>"
    assert _active_phase(session, ova.id, "engage").content == "<p>engage v1</p>"
