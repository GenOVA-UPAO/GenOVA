"""Nombres de archivo largos o con NUL no provocan un 500 al subir.

El archivo se guarda como `<uuid>_<nombre>`: un nombre de más de ~218 bytes
(unos 110 caracteres con tildes) superaba NAME_MAX y open() lanzaba
ENAMETOOLONG; un NUL lanzaba ValueError. Ninguno es un UploadError, así que
la petición entera respondía 500.
"""

import os
import uuid
from pathlib import Path

import pytest

from uploads.application.dto import IncomingFile
from uploads.application.use_cases import UploadFiles
from uploads.domain.policies import safe_filename
from uploads.infrastructure import in_memory_store as store
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository

PDF = b"%PDF-1.4\n%fake\n"


@pytest.fixture(autouse=True)
def _registro_limpio(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_TEMP_DIR", str(tmp_path))
    store.registry().clear()
    yield
    store.registry().clear()


class _Limits:
    def max_files_per_request(self):
        return 5

    def max_file_size_bytes(self):
        return 1024 * 1024

    def max_file_size_mb(self):
        return 1


class _Rag:
    def is_enabled(self):
        return False


@pytest.mark.parametrize("nombre", ["á" * 150 + ".pdf", "a\x00b.pdf"])
def test_la_subida_acepta_nombres_largos_o_con_nul(nombre):
    repo, user = InMemoryTempUploadRepository(), str(uuid.uuid4())

    out = UploadFiles(repo, _Rag(), _Limits()).execute(
        user, [IncomingFile(filename=nombre, content_type="application/pdf", content=PDF)]
    )

    assert out.errors == []
    path = Path(repo.get_storage_path(out.items[0].upload_id, user))
    assert path.is_file() and path.suffix == ".pdf"
    assert len(os.fsencode(path.name)) <= 255


def test_safe_filename_quita_controles_y_acota_bytes_conservando_la_extension():
    assert safe_filename("a\x00b\x1f\nc.pdf") == "abc.pdf"
    largo = safe_filename("á" * 150 + ".pdf")
    assert largo.endswith(".pdf") and len(largo.encode("utf-8")) <= 150
    assert safe_filename("../../etc/passwd") == "passwd"
    assert safe_filename("\x00") == "archivo"
    assert safe_filename("apunte.pdf") == "apunte.pdf"
