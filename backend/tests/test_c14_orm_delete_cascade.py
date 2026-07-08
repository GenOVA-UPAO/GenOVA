"""C14 — las relaciones ORM cuyo FK tiene ON DELETE en el DDL deben declarar
cascade="all, delete-orphan" + passive_deletes=True.

Regresión de B1/HU-012 (PR #90): DELETE /api/ovas/{id}/permanente devolvía 500
(NotNullViolation) porque Ova.versions no declaraba cascada y SQLAlchemy emitía
UPDATE ova_versions SET ova_id=NULL en el flush del delete, en vez de delegar
en el ON DELETE CASCADE de Postgres.

SQLite in-memory con PRAGMA foreign_keys=ON reproduce el mismo contrato
(NOT NULL + FK CASCADE). Sin el fix este test revienta igual que producción.

Uso:  pytest tests/test_c14_orm_delete_cascade.py -v
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine, event, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import models  # noqa: E402, F401 — registra todos los mappers (Ova referencia a User)
from ova.models import Ova, OvaPhase, OvaVersion  # noqa: E402

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
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng, "connect")
    def _fk_on(dbapi_conn, _record):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    with eng.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
    factory = sessionmaker(bind=eng, future=True)
    s = factory()
    try:
        yield s
    finally:
        s.close()


def test_c14_delete_ova_con_versiones_no_anula_el_fk(session):
    """db.delete(ova) con versiones/fases cargadas NO debe emitir UPDATE ova_id=NULL."""
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title="OVA con versiones")
    session.add(ova)
    session.flush()
    version = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="p")
    session.add(version)
    session.flush()
    session.add(
        OvaPhase(
            id=uuid.uuid4(),
            version_id=version.id,
            phase_type="engage",
            phase_order=0,
            content="<html></html>",
        )
    )
    session.commit()

    # Cargar la relación reproduce el flush de producción (el endpoint consulta el OVA).
    assert len(ova.versions) == 1

    session.delete(ova)
    session.commit()  # sin el fix: NotNullViolation/IntegrityError aquí

    for table in ("ova_phases", "ova_versions", "ovas"):
        assert session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() == 0  # noqa: S608
