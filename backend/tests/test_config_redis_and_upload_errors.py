"""REDIS_URL inválida no tumba el arranque; los errores de subida no exponen detalle interno."""

import json
import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402

from core.config import Settings  # noqa: E402
from uploads.domain.errors import (  # noqa: E402
    FileTooLarge,
    MimeNotAllowed,
    TooManyFiles,
    UploadError,
)
from uploads.interface.http.responses import error_response  # noqa: E402


@pytest.mark.parametrize("value", ["725bfe6489f1e8e02d0e801b371c43a5", "http://redis:6379", "  basura  "])
def test_redis_url_invalida_se_ignora(monkeypatch, value):
    monkeypatch.setenv("REDIS_URL", value)
    assert Settings(_env_file=None).redis_url == ""


@pytest.mark.parametrize("value", ["redis://localhost:6379/0", "rediss://u:p@host:6380", "unix:///tmp/r.sock", ""])
def test_redis_url_valida_se_conserva(monkeypatch, value):
    monkeypatch.setenv("REDIS_URL", value)
    assert Settings(_env_file=None).redis_url == value


def _body(err: UploadError) -> dict:
    return json.loads(error_response(err).body)


def test_errores_curados_conservan_su_mensaje():
    assert _body(MimeNotAllowed())["message"] == "Formato de archivo no soportado."
    assert "10MB" in _body(FileTooLarge(10))["message"]
    body = _body(TooManyFiles(5))
    assert body["max_files"] == 5 and "5 archivos" in body["message"]


def test_error_generico_no_expone_detalle():
    body = _body(UploadError("Traceback ... /app/uploads/infrastructure/x.py line 42"))
    assert body == {"error": "upload_error", "message": "No se pudo procesar el archivo."}
