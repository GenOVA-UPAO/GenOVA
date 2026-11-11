"""Adaptador SQLAlchemy del editor visual: confirmar solo escribe la versión activa."""

from __future__ import annotations

import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest
from sqlalchemy import text

from editor.domain.errors import EditConflictError
from editor.infrastructure.phase_repository import SqlAlchemyEditorPhaseRepository
from models import Ova, OvaPhase, OvaPhaseVersion, OvaVersion
from tests._sqlite_db import make_session


@pytest.fixture
def seeded():
    db = make_session(
        Ova.__table__, OvaVersion.__table__, OvaPhase.__table__, OvaPhaseVersion.__table__
    )
    # SQLite crea el índice parcial como único total: se rehace con su WHERE.
    db.execute(text("DROP INDEX uq_one_active_version_per_ova"))
    db.execute(
        text(
            "CREATE UNIQUE INDEX uq_one_active_version_per_ova ON ova_versions (ova_id) "
            "WHERE is_active"
        )
    )
    ova = Ova(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Fotosíntesis", status="listo")
    v1 = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="p", is_active=False)
    v2 = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=2, prompt="p", is_active=True)
    p1 = OvaPhase(
        id=uuid.uuid4(), version_id=v1.id, phase_type="engage", phase_order=1, content="<p>v1</p>"
    )
    p2 = OvaPhase(
        id=uuid.uuid4(), version_id=v2.id, phase_type="engage", phase_order=1, content="<p>v2</p>"
    )
    db.add(ova)
    db.flush()
    db.add_all([v1, v2])
    db.flush()
    db.add_all([p1, p2])
    db.commit()
    yield db, ova, p1, p2
    db.close()


def _confirm(db, ova, phase):
    return SqlAlchemyEditorPhaseRepository(db).update_phase_and_create_version(
        ova_id=ova.id, phase_id=phase.id, html_content="<p>nuevo</p>", instruction="x"
    )


def test_confirm_on_phase_of_inactive_version_is_conflict(seeded):
    db, ova, p1, _ = seeded
    with pytest.raises(EditConflictError) as error:
        _confirm(db, ova, p1)
    assert error.value.reason == "phase_not_active"
    db.rollback()
    assert db.get(OvaPhase, p1.id).content == "<p>v1</p>"  # el historial no se reescribe


def test_confirm_while_generating_is_conflict(seeded):
    db, ova, _, p2 = seeded
    db.get(Ova, ova.id).status = "generando"
    db.commit()
    with pytest.raises(EditConflictError) as error:
        _confirm(db, ova, p2)
    assert error.value.reason == "ova_generating"
    db.rollback()
    assert db.get(OvaPhase, p2.id).content == "<p>v2</p>"


def test_confirm_on_active_phase_writes_it(seeded):
    db, ova, _, p2 = seeded
    result = _confirm(db, ova, p2)
    assert result["minor_number"] == 1
    assert db.get(OvaPhase, p2.id).content == "<p>nuevo</p>"
