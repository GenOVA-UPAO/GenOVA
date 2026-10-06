"""La copia de un OVA conserva los nombres de sus recursos y sus ajustes (M8)."""

import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from test_regen_jobs_state import _DDL

from models import Ova, OvaPhase, OvaVersion
from ova.infrastructure.sqlalchemy_creation_repository import SqlAlchemyOvaCreationRepository


@pytest.fixture
def db():
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
    session = sessionmaker(bind=engine, future=True)()
    yield session
    session.close()
    engine.dispose()


def test_la_fuente_de_la_copia_trae_titulos_tipo_de_recurso_y_ajustes(db):
    ova = Ova(
        id=uuid.uuid4(), user_id=uuid.uuid4(), title="Derivadas", status="listo",
        package_theme="original", educational_level="universitario",
    )
    version = OvaVersion(id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="Derivadas")
    db.add_all([ova, version])
    db.flush()
    db.add(
        OvaPhase(
            id=uuid.uuid4(), version_id=version.id, phase_type="engage", phase_order=1,
            content="<p>x</p>", title="Enganche", resource_type_id=7,
        )
    )
    db.commit()

    repo = SqlAlchemyOvaCreationRepository(db)
    source = repo.get_duplicate_source(ova.id)
    assert [(p.title, p.resource_type_id) for p in source.phases] == [("Enganche", 7)]
    assert source.settings["package_theme"] == "original"
    assert source.settings["educational_level"] == "universitario"

    copy = Ova(id=uuid.uuid4(), user_id=ova.user_id, title="Derivadas (copia)", status="listo")
    db.add(copy)
    db.flush()
    repo._ovas[str(copy.id)] = copy
    repo.apply_settings(str(copy.id), source.settings)
    copy_version = OvaVersion(id=uuid.uuid4(), ova_id=copy.id, version_number=1, prompt=source.prompt)
    db.add(copy_version)
    db.flush()
    repo.add_phases(copy_version.id, source.phases)
    db.flush()
    copied = db.query(OvaPhase).filter(OvaPhase.version_id == copy_version.id).one()
    assert (copied.title, copied.resource_type_id) == ("Enganche", 7)
    assert copy.package_theme == "original"
