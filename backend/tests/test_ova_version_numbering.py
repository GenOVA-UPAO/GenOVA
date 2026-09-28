"""Regresión: dos filas «Versión 2» tras revertir y volver a guardar/regen.

El listado (`list_versions`) no duplica filas: devuelve cada row. El defecto
vivo era `active.version_number + 1` en create_next_version/regen, que reutiliza
el 2 si la activa volvió a ser v1. Job QA: OVA f6121351 (dos rows con number=2).
"""

import os
import sys
import uuid
from datetime import UTC, datetime

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, select, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import Ova, OvaPhase, OvaVersion  # noqa: E402
from ova.domain.editor import (  # noqa: E402
    EditorOva,
    EditorPhase,
    EditorVersion,
    next_version_number,
)
from ova.infrastructure.sqlalchemy_editor_repository import (  # noqa: E402
    SqlAlchemyOvaEditorRepository,
)

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
    factory = sessionmaker(bind=engine, future=True)
    db = factory()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def test_next_version_number_after_revert_does_not_reuse():
    assert next_version_number(()) == 1
    assert next_version_number((1,)) == 2
    assert next_version_number((1, 2)) == 3
    # Fórmula rota: active (v1) + 1 == 2, que ya existe.
    assert next_version_number((1, 2)) != 2


def _seed_ova_with_two_versions(session):
    ova = Ova(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Fotosíntesis",
        description="prompt",
        status="listo",
    )
    session.add(ova)
    session.flush()
    v1 = OvaVersion(
        id=uuid.uuid4(),
        ova_id=ova.id,
        version_number=1,
        prompt="prompt",
        is_active=False,
        created_at=datetime(2026, 9, 20, 0, 27, tzinfo=UTC),
    )
    v2 = OvaVersion(
        id=uuid.uuid4(),
        ova_id=ova.id,
        version_number=2,
        prompt="Haz el comic mas corto",
        is_active=True,
        created_at=datetime(2026, 9, 20, 0, 27, 52, tzinfo=UTC),
    )
    session.add_all([v1, v2])
    session.flush()
    session.add(
        OvaPhase(
            version_id=v1.id,
            phase_type="engage",
            phase_order=1,
            content="<p>v1</p>",
            regenerated=False,
        )
    )
    session.flush()
    return ova, v1, v2


def test_list_versions_returns_each_row_when_numbers_collide(session):
    ova, v1, v2 = _seed_ova_with_two_versions(session)
    extra = OvaVersion(
        id=uuid.uuid4(),
        ova_id=ova.id,
        version_number=2,
        prompt="prompt",
        is_active=False,
    )
    session.add(extra)
    session.flush()
    repo = SqlAlchemyOvaEditorRepository(session)
    # UUID nativo: el adaptador compara columnas UUID (SQLite no coercea str).
    listed = repo.list_versions(ova.id)
    assert len(listed) == 3
    assert sorted(v.version_number for v in listed) == [1, 2, 2]
    assert {v.id for v in listed} == {str(v1.id), str(v2.id), str(extra.id)}


def test_create_next_version_after_revert_uses_max_plus_one(session, monkeypatch):
    ova_row, v1, v2 = _seed_ova_with_two_versions(session)
    v2.is_active = False
    v1.is_active = True
    session.flush()
    phase = session.execute(select(OvaPhase).where(OvaPhase.version_id == v1.id)).scalar_one()

    repo = SqlAlchemyOvaEditorRepository(session)
    repo._versions[v1.id] = v1
    editor_ova = EditorOva(
        id=ova_row.id,
        owner_id=ova_row.user_id,
        title=ova_row.title,
        description=ova_row.description,
        status=ova_row.status,
    )
    active = EditorVersion(
        id=v1.id,
        version_number=1,
        prompt=v1.prompt,
        is_active=True,
        created_at=v1.created_at,
    )
    phases = (
        EditorPhase(
            id=str(phase.id),
            phase_type=phase.phase_type,
            phase_order=phase.phase_order,
            content=phase.content,
            regenerated=False,
            resource_type_id=None,
            title=None,
        ),
    )
    monkeypatch.setattr(
        SqlAlchemyOvaEditorRepository,
        "list_phases",
        lambda self, _vid: phases,
    )
    created = repo.create_next_version(editor_ova, active, phases)
    assert created.version_number == 3
    stored = (
        session.execute(select(OvaVersion.version_number).where(OvaVersion.ova_id == ova_row.id))
        .scalars()
        .all()
    )
    assert sorted(stored) == [1, 2, 3]
