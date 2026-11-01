"""POST /uploads/temp aplica los topes antes de cargar los archivos en memoria.

Antes el router hacía `await f.read()` de cada parte y solo después el caso de
uso miraba cuántos archivos eran y cuánto pesaban: un archivo de varios GB, o
cientos de partes, se cargaban enteros en RAM (512 MB en Render) antes de
cualquier rechazo.
"""

import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.dependencies import get_current_user
from core.database import get_db
from uploads.application.use_cases import ListUploads, UploadFiles
from uploads.container import UploadsUseCases, build_uploads
from uploads.infrastructure import in_memory_store as store
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository
from uploads.interface.http import router as http

PDF = b"%PDF-1.4\n%fake\n"
MAX_BYTES = 1024 * 1024


class _Limits:
    def max_files_per_request(self):
        return 2

    def max_file_size_bytes(self):
        return MAX_BYTES

    def max_file_size_mb(self):
        return 1


class _Rag:
    def is_enabled(self):
        return False


class _UploadFilesEspia(UploadFiles):
    """Registra cuántos bytes llegan al caso de uso por archivo."""

    def execute(self, user_id, files, ova_id=None):
        self.repo.recibidos.append([len(f.content) for f in files])
        return UploadFiles.execute(self, user_id, files, ova_id)


@pytest.fixture
def cliente(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    store.registry().clear()
    repo = InMemoryTempUploadRepository()
    repo.recibidos = []
    app = FastAPI()
    app.include_router(http.router, prefix="/api/uploads")
    app.dependency_overrides[get_db] = lambda: None
    usuario = type("U", (), {"id": uuid.uuid4()})()
    app.dependency_overrides[get_current_user] = lambda: usuario
    app.dependency_overrides[build_uploads] = lambda: UploadsUseCases(
        ListUploads(repo), _UploadFilesEspia(repo, _Rag(), _Limits()), None
    )
    yield TestClient(app), repo
    store.registry().clear()


def test_un_archivo_demasiado_grande_no_se_lee_entero(cliente):
    client, repo = cliente
    grande = PDF + b"0" * (3 * MAX_BYTES)

    res = client.post(
        "/api/uploads/temp", files={"files": ("grande.pdf", grande, "application/pdf")}
    )

    assert res.status_code == 200
    assert res.json()["errors"][0]["error"] == "file_too_large"
    assert repo.recibidos == [[MAX_BYTES + 1]]


def test_demasiados_archivos_se_rechazan_sin_leerlos(cliente):
    client, repo = cliente
    partes = [("files", (f"f{i}.pdf", PDF, "application/pdf")) for i in range(3)]

    res = client.post("/api/uploads/temp", files=partes)

    assert res.status_code == 400
    assert res.json()["error"] == "files_limit_exceeded"
    assert repo.recibidos == []


def test_el_endpoint_de_subida_no_bloquea_el_event_loop():
    # Todo su trabajo es E/S síncrona (BD y disco): como `def` corre en el
    # threadpool; como `async def` congelaba los demás endpoints (SSE incluido).
    import inspect

    assert not inspect.iscoroutinefunction(http.upload_temp_files)
