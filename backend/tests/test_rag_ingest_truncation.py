"""Tests puros de chunks_needed y del aviso de truncado en la ingesta (sin red)."""

import pytest

from rag.domain.chunking import MAX_CHUNKS_PER_FILE, chunks_needed


def test_chunks_needed_vacio():
    assert chunks_needed("") == 0
    assert chunks_needed("   \n  ") == 0


def test_chunks_needed_un_chunk():
    assert chunks_needed("hola mundo") == 1


def test_chunks_needed_exacto_con_overlap():
    # 800 chars, overlap 150 -> step 650: 2 chunks para 1300 chars
    text = "a" * 1300
    assert chunks_needed(text) == 2
    assert chunks_needed("a" * 650) == 1


def test_chunks_needed_redondea_hacia_arriba():
    assert chunks_needed("a" * 651) == 2
    assert chunks_needed("a" * 651) == 2
    assert chunks_needed("a" * 652) == 2


def test_chunks_needed_consistente_con_chunk_text():
    from rag.domain.chunking import chunk_text

    text = "palabra " * 3000  # 24.000 chars
    expected = chunks_needed(text)
    # mismo slide/normalize que chunk_text, sin tope
    assert expected == len(chunk_text(text, max_chunks=10**9))


def test_chunks_needed_parametros_invalidos():
    with pytest.raises(ValueError):
        chunks_needed("x", chunk_size=0)
    with pytest.raises(ValueError):
        chunks_needed("x", overlap=800)


# ---------------------------------------------------------------------------
# Ingesta: el truncado deja de ser silencioso (message en el resultado)
# ---------------------------------------------------------------------------


class _FakeExtractor:
    def detect_kind(self, filename: str) -> str | None:
        return "text"

    def extract_text(self, storage_path: str, *, filename: str) -> str:
        return "a" * 80_001  # 800/650 -> 124 chunks > tope 100


class _FakeEmbedder:
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [[0.0] * 8 for _ in texts]


class _FakeStore:
    def __init__(self) -> None:
        self.inserted: int | None = None

    def insert_chunks(self, **kwargs) -> int:
        self.inserted = len(kwargs["chunks"])
        return self.inserted


def _ingest(text: str) -> dict:
    from rag.application.use_cases.ingest_document import IngestDocument

    extractor = _FakeExtractor()
    extractor.extract_text = lambda storage_path, *, filename: text  # type: ignore[method-assign]
    use_case = IngestDocument(_FakeEmbedder(), _FakeStore(), extractor)
    return use_case.execute(
        user_id="u1", upload_id="up1", storage_path="/tmp/x", filename="tesis.md"
    )


def test_ingesta_truncada_expone_el_aviso():
    result = _ingest("a" * 80_001)
    assert result["status"] == "indexed"
    assert result["chunks"] == MAX_CHUNKS_PER_FILE
    assert "truncado" in result["message"]
    assert "124" in result["message"]  # chunks esperados sin tope
    assert str(MAX_CHUNKS_PER_FILE) in result["message"]


def test_ingesta_no_truncada_no_anade_message():
    result = _ingest("a" * 1300)  # 2 chunks, muy por debajo del tope
    assert result["status"] == "indexed"
    assert result["chunks"] == 2
    assert "message" not in result
