"""La cuota cuenta todos los contextos y reserva bajo lock."""
# ruff: noqa: E402

import os
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest
from fastapi import HTTPException

from uploads.domain.errors import UploadError
from uploads.infrastructure import in_memory_store as store
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository
from uploads.interface.http import router


def test_cuota_agregada_no_se_elude_cambiando_ova(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    monkeypatch.setenv("UPLOAD_MAX_FILES", "2")
    store.registry().clear()
    repo = InMemoryTempUploadRepository()
    repo.create("usuario", "a.txt", "text/plain", b"a", "ova-a")
    repo.create("usuario", "b.txt", "text/plain", b"b", "ova-b")
    with pytest.raises(UploadError):
        repo.create("usuario", "c.txt", "text/plain", b"c", "ova-c")
    store.registry().clear()


def test_cuota_de_bytes_es_agregada(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    monkeypatch.setenv("UPLOAD_MAX_TOTAL_BYTES", "3")
    store.registry().clear()
    repo = InMemoryTempUploadRepository()
    repo.create("usuario", "a.txt", "text/plain", b"aa")
    with pytest.raises(UploadError):
        repo.create("usuario", "b.txt", "text/plain", b"bb", "otro-contexto")
    store.registry().clear()


def test_scope_ova_inexistente_o_ajeno_es_rechazado():
    class DB:
        def execute(self, stmt):
            self.stmt = stmt
            return self

        def scalar_one_or_none(self):
            return None

    db = DB()
    with pytest.raises(HTTPException) as error:
        router.validate_ova_scope(uuid.uuid4(), uuid.uuid4(), db)
    assert error.value.status_code == 404
    assert "ovas.user_id" in str(db.stmt)
