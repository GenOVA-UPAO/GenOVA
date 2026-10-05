"""Contrato de edición aislada del tema y persistencia SQLAlchemy."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import uuid  # noqa: E402
from types import SimpleNamespace  # noqa: E402

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import JSON, MetaData, create_engine  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from auth.dependencies import get_current_user  # noqa: E402
from models import Ova, User  # noqa: E402
from ova.application.dto import UpdateOvaMetadataInput  # noqa: E402
from ova.application.use_cases.update_ova_metadata import UpdateOvaMetadata  # noqa: E402
from ova.container import build_ova  # noqa: E402
from ova.domain.errors import OvaEditError, OvaForbidden  # noqa: E402
from ova.domain.model import OvaActor  # noqa: E402
from ova.infrastructure.sqlalchemy_lifecycle_repository import (
    SqlAlchemyOvaLifecycleRepository,  # noqa: E402
)
from ova.interface.http.manage_router import router  # noqa: E402
from ova.interface.http.package_theme_router import router as theme_router  # noqa: E402


@pytest.fixture
def metadata_repo():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Ova.__table__.create(engine)
    users = User.__table__.to_metadata(MetaData())
    for column in users.columns:
        column.server_default = None
        if isinstance(column.type, JSONB):
            column.type = JSON()
    users.create(engine)
    owner = uuid.uuid4()
    ova_id = uuid.uuid4()
    with Session(engine) as db:
        db.add(Ova(id=ova_id, user_id=owner, title="Curso", status="listo"))
        db.commit()
        repo = SqlAlchemyOvaLifecycleRepository(db)
        get_active = repo.get_active
        # SQLite exige UUID para el bind; PostgreSQL acepta el id textual del
        # path. La adaptación pertenece únicamente al harness SQLite del test.
        repo.get_active = lambda value: get_active(uuid.UUID(str(value)))
        yield db, repo, str(ova_id), str(owner)
    engine.dispose()


def test_theme_persists_and_omitted_field_preserves_it(metadata_repo):
    db, repo, ova_id, owner = metadata_repo
    use_case = UpdateOvaMetadata(repo)
    actor = OvaActor(owner, False)
    assert repo.get_active(ova_id).package_theme == "upao"
    changed = use_case.execute(UpdateOvaMetadataInput(ova_id, actor, "Curso", None, package_theme="infantil"))
    assert changed.package_theme == "infantil"
    db.expire_all()
    assert repo.get_active(ova_id).package_theme == "infantil"
    result = use_case.execute(UpdateOvaMetadataInput(ova_id, actor, "Nuevo título", "Descripción"))
    db.expire_all()
    assert result.package_theme == repo.get_active(ova_id).package_theme == "infantil"
    assert repo.get_active(ova_id).description == "Descripción"


def test_invalid_theme_and_non_owner_do_not_mutate(metadata_repo):
    db, repo, ova_id, owner = metadata_repo
    use_case = UpdateOvaMetadata(repo)
    with pytest.raises(OvaEditError):
        use_case.execute(UpdateOvaMetadataInput(ova_id, OvaActor(owner, False), "Curso", None, package_theme="xxx"))
    with pytest.raises(OvaForbidden):
        use_case.execute(UpdateOvaMetadataInput(ova_id, OvaActor("other", True), "Curso", None, package_theme="oscuro"))
    db.expire_all()
    assert repo.get_active(ova_id).package_theme == "upao"


def test_metadata_http_validation_and_catalog(metadata_repo):
    _, repo, ova_id, owner = metadata_repo
    app = FastAPI()
    app.include_router(router, prefix="/api/ovas")
    app.include_router(theme_router, prefix="/api/ovas")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=owner, admin_flag_cached=False)
    app.dependency_overrides[build_ova] = lambda: SimpleNamespace(update_metadata=UpdateOvaMetadata(repo))
    with TestClient(app) as client:
        res = client.patch(f"/api/ovas/{ova_id}/metadata", json={"title": "Curso", "package_theme": "inventado"})
        assert res.status_code == 422
        catalog = client.get("/api/ovas/package-themes/catalog")
        assert catalog.status_code == 200
        assert len(catalog.json()["themes"]) == 5
        changed = client.patch(
            f"/api/ovas/{ova_id}/metadata",
            json={"title": "Curso", "description": "Descripción", "package_theme": "oscuro"},
        )
        assert changed.status_code == 200
        assert changed.json()["package_theme"] == "oscuro"
        renamed = client.patch(
            f"/api/ovas/{ova_id}/metadata", json={"title": "Renombrado", "description": "Nueva"},
        )
        assert renamed.status_code == 200
        assert renamed.json()["package_theme"] == "oscuro"
        assert repo.get_active(ova_id).package_theme == "oscuro"
