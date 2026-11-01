"""DOCX/PPTX que descomprimidos son enormes (zip bomb) se rechazan sin abrirlos.

El tope de subida mide bytes comprimidos y la firma de un zip pasa por Office:
un .pptx de ~300 KB con un miembro de 300 MB de ceros se aceptaba y la ingesta
en segundo plano lo abría con python-pptx, que lee todos los miembros en
memoria (OOM del proceso web).
"""

import io
import uuid
import zipfile

import pytest

from core.archives import office_zip_within_limits
from rag.application.errors import ParserError
from rag.infrastructure.parsers import extract_text
from uploads.application.dto import IncomingFile
from uploads.application.use_cases import UploadFiles
from uploads.infrastructure import in_memory_store as store
from uploads.infrastructure.temp_upload_repository import InMemoryTempUploadRepository

PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


@pytest.fixture(scope="module")
def bomba() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("junk.bin", b"\0" * 300_000_000)
    return buf.getvalue()


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
        return 20 * 1024 * 1024

    def max_file_size_mb(self):
        return 20


class _Rag:
    def is_enabled(self):
        return True

    def ingest(self, **kw):
        raise AssertionError("no debe ingerirse")


def test_la_subida_rechaza_un_pptx_que_es_una_zip_bomb(bomba):
    assert len(bomba) < 20 * 1024 * 1024  # pasa el tope de bytes comprimidos
    repo = InMemoryTempUploadRepository()

    out = UploadFiles(repo, _Rag(), _Limits()).execute(
        str(uuid.uuid4()), [IncomingFile(filename="x.pptx", content_type=PPTX, content=bomba)]
    )

    assert out.items == []
    assert out.errors[0].error == "archive_too_large"
    assert store.registry() == {}


def test_el_parser_no_abre_una_zip_bomb_ya_guardada(bomba, tmp_path):
    path = tmp_path / "x.pptx"
    path.write_bytes(bomba)

    with pytest.raises(ParserError):
        extract_text(str(path))


def test_documentos_office_reales_pasan_el_control(tmp_path):
    import docx
    from pptx import Presentation

    pptx_path, docx_path = tmp_path / "a.pptx", tmp_path / "a.docx"
    Presentation().save(str(pptx_path))
    documento = docx.Document()
    documento.add_paragraph("Fotosíntesis")
    documento.save(str(docx_path))

    assert office_zip_within_limits(pptx_path.read_bytes())
    assert office_zip_within_limits(str(docx_path))
    assert extract_text(str(docx_path)) == "Fotosíntesis"


def test_un_archivo_que_no_es_zip_no_pasa():
    assert office_zip_within_limits(b"no soy un zip") is False
