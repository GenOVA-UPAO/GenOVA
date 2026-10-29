"""Metadatos: contrato HTTP, persistencia, migración y contenido real de cada ZIP."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "metadata-test-secret-0123456789-abcdef")

# ruff: noqa: E402
import uuid
from dataclasses import replace
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text

from auth.dependencies import get_current_user
from core.educational_metadata import (
    LICENSES,
    EducationalMetadata,
    InvalidEducationalMetadata,
    metadata_from_ova,
)
from models import Ova as OvaORM
from models import User
from ova.application.dto import UpdateOvaMetadataInput
from ova.application.use_cases.update_ova_metadata import UpdateOvaMetadata
from ova.container import build_ova
from ova.domain.errors import OvaForbidden, OvaGenerating, OvaNotFound
from ova.domain.model import Ova, OvaActor, OvaOwner
from ova.infrastructure.sqlalchemy_lifecycle_repository import SqlAlchemyOvaLifecycleRepository
from ova.interface.http.history_router import _ova_to_dict
from ova.interface.http.manage_router import router
from run_migrations import _split_statements
from scorm import build_export
from tests._sqlite_db import make_session

META = EducationalMetadata(
    license="CC BY-NC-SA 4.0", language="es-PE", author='María & José <UPAO>',
    description='Descripción <didáctica> & práctica', keywords=["células", "biología & salud"],
    educational_level="educación superior", audience="estudiantes de primer ciclo",
    typical_learning_time="PT1H30M",
)
LOM = "{http://ltsc.ieee.org/xsd/LOM}"


@pytest.mark.parametrize("fmt", ["scorm12", "scorm2004", "ims", "html", "epub", "elpx"])
def test_each_package_carries_teacher_metadata(fmt):
    with ZipFile(BytesIO(build_export(fmt, "Título & curso", [], metadata=META))) as package:
        if fmt in {"scorm12", "scorm2004", "ims"}:
            root = ET.fromstring(package.read("imsmanifest.xml"))
            lom = root.find(f".//{LOM}lom")
            assert lom is not None
            assert lom.find(f"{LOM}general/{LOM}title/{LOM}string").text == "Título & curso"
            assert lom.find(f"{LOM}general/{LOM}language").text == META.language
            assert lom.find(f"{LOM}general/{LOM}description/{LOM}string").text == META.description
            assert [k.text for k in lom.findall(f"{LOM}general/{LOM}keyword/{LOM}string")] == META.keywords
            assert META.author in lom.find(f"{LOM}lifeCycle/{LOM}contribute/{LOM}entity").text
            assert lom.find(f"{LOM}educational/{LOM}context/{LOM}value").text == META.educational_level
            assert lom.find(f"{LOM}educational/{LOM}typicalLearningTime/{LOM}duration").text == "PT1H30M"
            assert lom.find(f"{LOM}educational/{LOM}description/{LOM}string").text == META.audience
            assert lom.find(f"{LOM}rights/{LOM}description/{LOM}string").text == META.license
        elif fmt == "epub":
            root = ET.fromstring(package.read("EPUB/package.opf"))
            dc = "{http://purl.org/dc/elements/1.1/}"
            for name, value in [("rights", META.license), ("language", META.language), ("creator", META.author), ("description", META.description)]:
                assert root.find(f".//{dc}{name}").text == value
            assert [k.text for k in root.findall(f".//{dc}subject")] == META.keywords
        elif fmt == "elpx":
            root = ET.fromstring(package.read("content.xml"))
            ns = "{http://www.intef.es/xsd/ode}"
            props = {p.find(f"{ns}key").text: p.find(f"{ns}value").text for p in root.findall(f"{ns}odeProperties/{ns}odeProperty")}
            assert props["pp_license"] == META.exe_license
            assert props["pp_licenseUrl"] == META.license_url
            assert props["pp_lang"] == META.language
            assert props["pp_author"] == META.author
            assert props["pp_description"] == META.description
            assert props["pp_keywords"] == ", ".join(META.keywords)
            assert META.audience in props["pp_extraHeadContent"]
        else:
            from bs4 import BeautifulSoup

            page = BeautifulSoup(package.read("index.html"), "html.parser")
            assert page.html["lang"] == META.language
            for name, value in [("author", META.author), ("description", META.description), ("license", META.license), ("keywords", ", ".join(META.keywords))]:
                assert page.find("meta", attrs={"name": name})["content"] == value
            assert page.footer.find("a")["href"] == META.license_url


@pytest.mark.parametrize("license", list(LICENSES))
def test_license_mapping_and_lom_rights(license):
    meta = EducationalMetadata(license=license)
    with ZipFile(BytesIO(build_export("scorm12", "Curso", [], metadata=meta))) as package:
        root = ET.fromstring(package.read("imsmanifest.xml"))
        assert root.find(f".//{LOM}copyrightAndOtherRestrictions/{LOM}value").text == ("no" if license == "CC0 1.0" else "yes")
    with ZipFile(BytesIO(build_export("elpx", "Curso", [], metadata=meta))) as package:
        assert meta.exe_license.encode() in package.read("content.xml")


@pytest.mark.parametrize("values", [
    {"license": "MIT"}, {"language": "es<script>"}, {"language": ""},
    {"keywords": [""]}, {"keywords": ["a,b"]}, {"keywords": ["x" * 101]},
    {"keywords": ["x"] * 31}, {"typical_learning_time": "PT"},
    {"typical_learning_time": "30 minutos"}, {"author": "x" * 256},
])
def test_metadata_validation(values):
    with pytest.raises(InvalidEducationalMetadata):
        EducationalMetadata(**values)


def _ova():
    return Ova("ova-1", "owner", "Curso", "Descripción", "listo", None, None, 1,
               None, None, None, owner=OvaOwner("owner", "Docente"), **META.as_dict(exclude={"description"}))


class Repository:
    def __init__(self):
        self.ova = _ova()
        self.commits = []

    def get_active(self, ova_id):
        return self.ova if ova_id == "ova-1" else None

    def update_metadata(self, ova_id, title, description, **metadata):
        self.ova = replace(self.ova, title=title, description=description, **metadata)

    def commit(self, operation):
        self.commits.append(operation)


@pytest.fixture
def client():
    repo = Repository()
    app = FastAPI()
    app.include_router(router, prefix="/api/ovas")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="owner", admin_flag_cached=False)
    app.dependency_overrides[build_ova] = lambda: SimpleNamespace(update_metadata=UpdateOvaMetadata(repo))
    with TestClient(app) as http:
        yield http, repo


def test_api_updates_returns_and_preserves_metadata(client):
    http, repo = client
    response = http.patch("/api/ovas/ova-1/metadata", json={"title": "Nuevo", "description": "Resumen", "license": "CC BY 4.0", "keywords": [" agua ", "agua"]})
    assert response.status_code == 200
    assert response.json()["keywords"] == ["agua"]
    assert response.json()["language"] == META.language
    assert response.json()["license"] == "CC BY 4.0"
    assert repo.ova.author == META.author
    assert _ova_to_dict(repo.ova, False)["typical_learning_time"] == META.typical_learning_time
    assert repo.commits == ["update_ova_metadata"]


@pytest.mark.parametrize("values", [{"license": "MIT"}, {"typical_learning_time": "P1X"}, {"description": "x" * 2001}])
def test_api_rejects_invalid_metadata_without_committing(client, values):
    http, repo = client
    assert http.patch("/api/ovas/ova-1/metadata", json={"title": "Curso", **values}).status_code == 422
    assert repo.commits == []


@pytest.mark.parametrize(("owner", "status", "error"), [("other", "listo", OvaForbidden), ("owner", "generando", OvaGenerating)])
def test_edit_guards(owner, status, error):
    repo = Repository()
    repo.ova = replace(repo.ova, owner_id=owner, status=status)
    with pytest.raises(error):
        UpdateOvaMetadata(repo).execute(UpdateOvaMetadataInput("ova-1", OvaActor("owner", False), "Curso", None))
    assert repo.commits == []


def test_missing_ova_and_default_author():
    repo = Repository()
    with pytest.raises(OvaNotFound):
        UpdateOvaMetadata(repo).execute(UpdateOvaMetadataInput("missing", OvaActor("owner", False), "Curso", None))
    assert metadata_from_ova(replace(repo.ova, author="")).author == "Docente"
    result = UpdateOvaMetadata(repo).execute(UpdateOvaMetadataInput("ova-1", OvaActor("owner", False), "Curso", None, metadata={"author": ""}))
    assert result.metadata["author"] == "Docente"


def test_orm_persists_metadata_and_defaults():
    db = make_session(User.__table__, OvaORM.__table__)
    try:
        owner = User(id=uuid.uuid4(), email="test@upao.edu.pe", password_hash="x", full_name="Docente",
                     llm_settings={}, enabled_models=[], ova_settings={}, theme_settings={}, resource_configs={}, user_api_keys={}, totp_backup_codes=[])
        ova = OvaORM(id=uuid.uuid4(), user_id=owner.id, title="Curso")
        db.add_all([owner, ova])
        db.commit()
        assert (ova.license, ova.language, ova.keywords) == ("CC BY-SA 4.0", "es", [])
        repo = SqlAlchemyOvaLifecycleRepository(db)
        assert repo.get_active(ova.id).author == "Docente"
        repo.update_metadata(str(ova.id), "Nuevo", META.description, **META.as_dict(exclude={"description"}))
        repo.commit("test_metadata")
        db.expire_all()
        assert metadata_from_ova(db.get(OvaORM, ova.id)) == META
    finally:
        db.close()


def test_migration_adds_defaults_and_backfills_existing_owner():
    # Ejecuta el SQL incremental real con la única adaptación necesaria para SQLite:
    # IF NOT EXISTS en ADD COLUMN (Postgres permite reejecutar la migración).
    from sqlalchemy import create_engine

    sql = (Path(__file__).parents[1] / "migrations/051_ova_educational_metadata.sql").read_text()
    engine = create_engine("sqlite://")
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE TABLE users (id TEXT, full_name TEXT, email TEXT)"))
            conn.execute(text("CREATE TABLE ovas (id TEXT, user_id TEXT, description TEXT)"))
            conn.execute(text("INSERT INTO users VALUES ('u', 'Docente', 'a@b.c')"))
            conn.execute(text("INSERT INTO ovas VALUES ('o', 'u', 'Descripción existente')"))
            for statement in _split_statements(sql.replace("ADD COLUMN IF NOT EXISTS", "ADD COLUMN")):
                if statement.strip():
                    conn.execute(text(statement))
            row = conn.execute(text("SELECT license, language, keywords, author, description FROM ovas")).one()
            assert tuple(row) == ("CC BY-SA 4.0", "es", "[]", "Docente", "Descripción existente")
    finally:
        engine.dispose()


@pytest.mark.skipif(not os.getenv("GENOVA_METADATA_PG_CONTAINER"), reason="requiere un contenedor Postgres de pruebas")
def test_migration_postgres_is_idempotent_and_preserves_existing_data():
    import subprocess

    migration = (Path(__file__).parents[1] / "migrations/051_ova_educational_metadata.sql").read_text()
    schema = f"metadata_test_{uuid.uuid4().hex}"
    sql = f"""BEGIN;
CREATE SCHEMA {schema};
SET LOCAL search_path TO {schema};
CREATE TABLE users (id UUID PRIMARY KEY, full_name TEXT, email TEXT);
CREATE TABLE ovas (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), description TEXT);
INSERT INTO users VALUES ('00000000-0000-0000-0000-000000000001', 'Docente', 'test@upao.edu.pe');
INSERT INTO ovas VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Conservar');
{migration}
UPDATE ovas SET license='CC BY 4.0', author='Autor editado', keywords='["agua"]';
{migration}
SELECT license || '|' || language || '|' || author || '|' || description || '|' || keywords::text FROM ovas;
ROLLBACK;
"""
    result = subprocess.run(
        ["docker", "exec", os.environ["GENOVA_METADATA_PG_CONTAINER"], "sh", "-c",
         'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "$1"', "metadata-test", sql],
        text=True, capture_output=True, timeout=30, check=True,
    )
    assert 'CC BY 4.0|es|Autor editado|Conservar|["agua"]' in result.stdout


def test_regeneration_persists_updated_metadata_in_stored_scorm(monkeypatch, tmp_path):
    from generation.infrastructure import regen_persist

    ova = SimpleNamespace(title="Título actualizado", user_id="owner", **META.as_dict())
    monkeypatch.setattr("storage.is_configured", lambda: False)
    monkeypatch.setattr(regen_persist, "ova_output_dir", lambda: str(tmp_path))
    commits = []
    regen_persist._build_and_persist(ova, "ova-1", SimpleNamespace(id="v2"), 2,
                                   [{"type": "engage", "order": 1, "content": "<p>Hola</p>"}],
                                   SimpleNamespace(commit=lambda: commits.append(True)))
    with ZipFile(ova.file_path) as package:
        root = ET.fromstring(package.read("imsmanifest.xml"))
        assert root.find(f".//{LOM}general/{LOM}title/{LOM}string").text == "Título actualizado"
        assert root.find(f".//{LOM}rights/{LOM}description/{LOM}string").text == META.license
        assert META.author in root.find(f".//{LOM}contribute/{LOM}entity").text
    assert ova.current_version_id == "v2"
    assert commits == [True]
