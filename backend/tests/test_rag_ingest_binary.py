"""Ingesta multimodal (PDF/audio): el texto se trocea y el contexto queda acotado.

Antes `_ingest_binary` guardaba el texto extraído entero como UN chunk (un PDF
de 60 páginas, cientos de miles de caracteres) y `select_context_chunks`
admitía siempre el primer chunk sin recortarlo: el documento completo entraba
en el prompt de cada recurso. Además, si el embedding del archivo fallaba (PDF
de más páginas de las que admite Gemini) el documento quedaba `failed` aunque
su texto se podía indexar. Sin red: embedder, extractor y store falsos.
"""

import pytest

from rag.application.errors import EmbedderError
from rag.application.use_cases.ingest_document import IngestDocument
from rag.domain.chunking import DEFAULT_CHUNK_SIZE
from rag.domain.context import DEFAULT_MAX_CONTEXT_CHARS, build_contexto_usuario


class _Embedder:
    supports_multimodal = True
    fingerprint = "fake"

    def __init__(self, file_error: Exception | None = None) -> None:
        self.file_error = file_error

    def embed_file(self, data: bytes, mime_type: str) -> list[float]:
        if self.file_error is not None:
            raise self.file_error
        return [0.1] * 3

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * 3 for _ in texts]


class _Extractor:
    def __init__(self, text: str) -> None:
        self.text = text

    def detect_kind(self, filename: str) -> str | None:
        return "pdf"

    def extract_text(self, storage_path: str, *, filename: str) -> str:
        return self.text


class _Store:
    def __init__(self) -> None:
        self.chunks: list[str] = []

    def insert_chunks(self, **kwargs) -> int:
        self.chunks = list(kwargs["chunks"])
        return len(self.chunks)


@pytest.fixture
def pdf(tmp_path):
    path = tmp_path / "grande.pdf"
    path.write_bytes(b"%PDF-1.4 falso")
    return str(path)


def _ingest(pdf: str, text: str, embedder: _Embedder) -> tuple[dict, _Store]:
    store = _Store()
    result = IngestDocument(embedder, store, _Extractor(text)).execute(
        user_id="u1", upload_id="up1", storage_path=pdf, filename="grande.pdf"
    )
    return result, store


def test_el_texto_de_un_pdf_se_trocea_en_fragmentos_acotados(pdf):
    result, store = _ingest(pdf, "palabra " * 50_000, _Embedder())

    assert result["status"] == "indexed" and result["mode"] == "multimodal"
    assert len(store.chunks) > 1
    assert all(len(c) <= DEFAULT_CHUNK_SIZE for c in store.chunks)


def test_si_el_embedding_del_archivo_falla_se_indexa_por_el_texto(pdf):
    result, store = _ingest(pdf, "palabra " * 500, _Embedder(EmbedderError("demasiadas páginas")))

    assert result["status"] == "indexed"
    assert "mode" not in result
    assert store.chunks and all(len(c) <= DEFAULT_CHUNK_SIZE for c in store.chunks)


def test_sin_texto_se_guarda_solo_el_vector_del_archivo(pdf):
    result, store = _ingest(pdf, "  ", _Embedder())

    assert result["status"] == "indexed" and result["mode"] == "multimodal"
    assert store.chunks == ["[Archivo multimodal: grande.pdf (application/pdf)]"]


def test_sin_texto_ni_embedding_del_archivo_falla(pdf):
    result, _ = _ingest(pdf, "", _Embedder(EmbedderError("caído")))

    assert result == {"status": "failed", "reason": "embedder_unavailable", "chunks": 0}


def test_un_chunk_enorme_se_recorta_al_presupuesto_del_contexto():
    contexto = build_contexto_usuario([{"content": "y" * 50_000, "source_filename": "a.pdf"}])

    assert "y" * 100 in contexto
    assert len(contexto) < DEFAULT_MAX_CONTEXT_CHARS + 600
