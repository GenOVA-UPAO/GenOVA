"""Contrato de `GET /api/ovas/{ova_id}/export?format=` (caso de uso real, repos falsos)."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

from collections.abc import Generator  # noqa: E402
from dataclasses import replace  # noqa: E402
from io import BytesIO  # noqa: E402
from types import SimpleNamespace  # noqa: E402
from zipfile import ZipFile  # noqa: E402

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from auth.dependencies import get_current_user, require_permission  # noqa: E402
from ova.application.dto import ExportOvaInput  # noqa: E402
from ova.application.use_cases import ExportPackage, ExportScorm  # noqa: E402
from ova.container import build_ova  # noqa: E402
from ova.domain.editor import EditorPhase, EditorVersion  # noqa: E402
from ova.domain.errors import OvaEditError, OvaForbidden, OvaNotFound  # noqa: E402
from ova.domain.model import Ova, OvaActor  # noqa: E402
from ova.interface.http.export_router import router as export_router  # noqa: E402
from scorm import get_export_format  # noqa: E402

OWNER = "user-1"


def _ova(status: str = "listo", title: str = "Lección de Historia", file_path=None, key=None):
    return Ova(
        id="ova-1",
        owner_id=OWNER,
        title=title,
        description=None,
        status=status,
        file_path=file_path,
        storage_key=key,
        version_number=3,
        created_at=None,
        updated_at=None,
        deleted_at=None,
    )


class FakeLifecycle:
    def __init__(self, ova: Ova | None):
        self.ova = ova

    def get_active(self, ova_id: str):
        return self.ova if self.ova and ova_id == self.ova.id else None


class FakeEditor:
    def __init__(self):
        self.listed: list[str] = []

    def get_active_version(self, ova_id: str):
        return EditorVersion(
            id="ver-3", version_number=3, prompt="", is_active=True, created_at=None
        )

    def list_phases(self, version_id: str):
        self.listed.append(version_id)
        return (
            EditorPhase("p2", "evaluate", 2, "<p>Quiz</p>", False, None, None),
            EditorPhase("p1", "engage", 1, "<p>Hola</p>", False, None, "Bienvenida"),
        )


class FakePackages:
    def __init__(self, url: str | None = None, on_disk: bool = False):
        self.url = url
        self.on_disk = on_disk

    def try_signed_url(self, storage_key, filename=None, ova_id=None):
        return self.url

    def disk_available(self, file_path):
        return self.on_disk


def _use_case(ova, packages=None, editor=None) -> ExportPackage:
    lifecycle = FakeLifecycle(ova)
    editor = editor or FakeEditor()
    scorm = ExportScorm(lifecycle, editor, packages or FakePackages())
    return ExportPackage(lifecycle, editor, scorm, get_export_format)


def _input(fmt: str, actor_id: str = OWNER) -> ExportOvaInput:
    return ExportOvaInput(ova_id="ova-1", actor=OvaActor(id=actor_id, is_admin=False), format=fmt)


# --- caso de uso ------------------------------------------------------------------


def test_unknown_format_is_400_before_touching_repos():
    with pytest.raises(OvaEditError) as exc:
        _use_case(None).execute(_input("pdf"))
    assert (exc.value.status_code, exc.value.error) == (400, "unknown_format")
    assert exc.value.message == "Formato de exportación no soportado: pdf"


def test_missing_forbidden_and_not_ready():
    with pytest.raises(OvaNotFound):
        _use_case(None).execute(_input("epub"))
    with pytest.raises(OvaForbidden):
        _use_case(_ova()).execute(_input("epub", actor_id="otro"))
    with pytest.raises(OvaEditError) as exc:
        _use_case(_ova(status="generando")).execute(_input("epub"))
    assert (exc.value.status_code, exc.value.error) == (409, "ova_not_ready")


def test_builds_active_version_phases_on_the_fly():
    editor = FakeEditor()
    result = _use_case(_ova(), editor=editor).execute(_input("html"))
    assert editor.listed == ["ver-3"]
    assert result.kind == "bytes"
    assert result.filename == "Lección de Historia_v3.zip"
    assert result.media_type == "application/zip"
    z = ZipFile(BytesIO(result.content))
    # Ordenadas por phase_order y con el título propio de la fase.
    assert "Hola" in z.read("resources/recurso_1.html").decode()
    assert "Bienvenida" in z.read("index.html").decode()


def test_scorm12_rebuilds_even_when_a_stored_package_exists():
    result = _use_case(_ova(key="k"), FakePackages(url="https://signed/x")).execute(
        _input("scorm12")
    )
    assert result.kind == "bytes"
    assert result.filename == "Lección de Historia_v3.zip"
    with ZipFile(BytesIO(result.content)) as package:
        assert "--primary:#0A3D91" in package.read("resources/styles.css").decode()


# --- HTTP -------------------------------------------------------------------------


@pytest.fixture
def make_client() -> Generator:
    app = FastAPI()
    app.include_router(export_router, prefix="/api/ovas")
    user = SimpleNamespace(id=OWNER, admin_flag_cached=False)
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[require_permission("export_ova")] = lambda: user

    def factory(use_case: ExportPackage) -> TestClient:
        app.dependency_overrides[build_ova] = lambda: SimpleNamespace(
            export_package=use_case, export_scorm=use_case.export_scorm
        )
        return TestClient(app)

    yield factory
    app.dependency_overrides.clear()


def test_http_400_unknown_format(make_client):
    res = make_client(_use_case(_ova())).get("/api/ovas/ova-1/export?format=pdf")
    assert res.status_code == 400
    assert res.json() == {
        "error": "unknown_format",
        "message": "Formato de exportación no soportado: pdf",
    }


def test_http_409_not_ready(make_client):
    res = make_client(_use_case(_ova(status="generando"))).get("/api/ovas/ova-1/export?format=elpx")
    assert res.status_code == 409
    assert res.json()["error"] == "ova_not_ready"


def test_http_404_missing(make_client):
    res = make_client(_use_case(None)).get("/api/ovas/ova-1/export?format=epub")
    assert res.status_code == 404
    assert res.json()["error"] == "not_found"


@pytest.mark.parametrize(
    ("fmt", "filename", "media_type"),
    [
        ("scorm2004", "Leccion de Historia_v3.zip", "application/zip"),
        ("ims", "Leccion de Historia_v3.zip", "application/zip"),
        ("html", "Leccion de Historia_v3.zip", "application/zip"),
        ("epub", "Leccion de Historia_v3.epub", "application/epub+zip"),
        ("elpx", "Leccion de Historia_v3.elpx", "application/zip"),
        ("h5p", "Leccion de Historia_v3.h5p", "application/zip"),
    ],
)
def test_http_200_attachment(make_client, fmt, filename, media_type):
    res = make_client(_use_case(_ova(title="Leccion de Historia"))).get(
        f"/api/ovas/ova-1/export?format={fmt}"
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith(media_type)
    assert res.headers["content-disposition"] == f'attachment; filename="{filename}"'
    ZipFile(BytesIO(res.content)).testzip()


def test_http_non_ascii_title_gets_rfc5987_filename(make_client):
    res = make_client(_use_case(_ova())).get("/api/ovas/ova-1/export?format=epub")
    assert res.status_code == 200
    disposition = res.headers["content-disposition"]
    assert disposition.startswith('attachment; filename="Leccion de Historia_v3.epub"')
    assert "filename*=UTF-8''Lecci%C3%B3n%20de%20Historia_v3.epub" in disposition


@pytest.mark.parametrize("fmt", ["scorm12", "scorm2004", "ims", "html", "epub", "elpx"])
def test_http_uses_persisted_theme_instead_of_stored_zip(make_client, fmt):
    ova = replace(_ova(key="old-zip"), package_theme="oscuro")
    client = make_client(_use_case(ova, FakePackages(url="https://signed/old-zip")))
    response = client.get(f"/api/ovas/ova-1/export?format={fmt}")
    assert response.status_code == 200
    with ZipFile(BytesIO(response.content)) as package:
        path = (
            "EPUB/recurso_1.xhtml" if fmt == "epub" else
            "content/resources/genova/recurso_1.html" if fmt == "elpx" else
            "resources/recurso_1.html"
        )
        assert "--bg:#000000 !important;" in package.read(path).decode()


def test_http_scorm12_default_matches_export_scorm(make_client):
    client = make_client(_use_case(_ova(key="k"), FakePackages(url="https://signed/x")))
    default = client.get("/api/ovas/ova-1/export")
    explicit = client.get("/api/ovas/ova-1/export?format=scorm12")
    legacy = client.get("/api/ovas/ova-1/export-scorm")
    assert default.status_code == explicit.status_code == legacy.status_code == 200
    for response in (default, explicit, legacy):
        with ZipFile(BytesIO(response.content)) as package:
            assert "--primary:#0A3D91" in package.read("resources/styles.css").decode()
        assert response.headers["content-type"] == "application/zip"


def test_http_scorm12_does_not_serve_stale_stored_file(make_client, tmp_path):
    stored = tmp_path / "ova-1_v3.zip"
    stored.write_bytes(b"PK-stored")
    client = make_client(
        _use_case(_ova(title="Historia", file_path=str(stored)), FakePackages(on_disk=True))
    )
    res = client.get("/api/ovas/ova-1/export?format=scorm12")
    assert res.status_code == 200
    with ZipFile(BytesIO(res.content)) as package:
        assert "Hola" in package.read("resources/recurso_1.html").decode()
    assert res.headers["content-type"] == "application/zip"
    assert 'filename="Historia_v3.zip"' in res.headers["content-disposition"]


def test_route_is_mounted_in_main_app():
    """Sin sesión el endpoint responde 401 (no 404): está montado bajo /api/ovas."""
    from main import app

    app.dependency_overrides.clear()
    client = TestClient(app)
    assert client.get("/api/ovas/ova-1/export?format=epub").status_code == 401
    assert client.get("/api/ovas/ova-1/export-scorm").status_code == 401
