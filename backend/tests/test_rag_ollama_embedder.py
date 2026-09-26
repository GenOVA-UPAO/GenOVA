"""Embedder de Ollama (`RAG_EMBEDDER=ollama`) para desarrollo local, sin red."""

import httpx
import pytest

from rag.application.errors import EmbedderError
from rag.infrastructure import embedders
from rag.infrastructure.embedders import VECTOR_DIM, OllamaEmbedder


class _Resp:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status

    def raise_for_status(self):
        if self.status_code >= 400:
            request = httpx.Request("POST", "http://ollama/api/embed")
            raise httpx.HTTPStatusError(
                "error", request=request, response=httpx.Response(self.status_code)
            )

    def json(self):
        return self._payload


def _fake_post(calls, dim=VECTOR_DIM):
    def post(url, json, timeout):
        calls.append({"url": url, "json": json, "timeout": timeout})
        return _Resp({"embeddings": [[0.1] * dim for _ in json["input"]]})

    return post


def test_documentos_y_consulta_llevan_su_prefijo_de_tarea(monkeypatch):
    monkeypatch.setenv("OLLAMA_URL", "http://ollama:11434/")
    calls: list[dict] = []
    monkeypatch.setattr(httpx, "post", _fake_post(calls))
    emb = OllamaEmbedder()

    vectors = emb.embed_batch(["uno", "dos"])
    query = emb.embed_query("¿qué es?")

    assert len(vectors) == 2 and len(query) == VECTOR_DIM
    assert calls[0]["url"] == "http://ollama:11434/api/embed"
    assert calls[0]["json"]["model"] == "nomic-embed-text"
    assert calls[0]["json"]["input"] == ["search_document: uno", "search_document: dos"]
    assert calls[1]["json"]["input"] == ["search_query: ¿qué es?"]


def test_lotes_de_32(monkeypatch):
    calls: list[dict] = []
    monkeypatch.setattr(httpx, "post", _fake_post(calls))
    out = OllamaEmbedder().embed_batch([f"t{i}" for i in range(70)])
    assert len(out) == 70
    assert [len(c["json"]["input"]) for c in calls] == [32, 32, 6]


def test_dimension_distinta_de_la_columna_es_error(monkeypatch):
    monkeypatch.setattr(httpx, "post", _fake_post([], dim=384))
    with pytest.raises(EmbedderError, match="768"):
        OllamaEmbedder().embed_batch(["x"])


def test_fallo_http_se_traduce_a_embedder_error(monkeypatch):
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _Resp({}, status=500))
    with pytest.raises(EmbedderError, match="Ollama"):
        OllamaEmbedder().embed_query("x")


def test_servidor_caido_es_embedder_error(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("refused")

    monkeypatch.setattr(httpx, "post", boom)
    with pytest.raises(EmbedderError):
        OllamaEmbedder().embed_batch(["x"])


def test_get_embedder_elige_ollama(monkeypatch):
    monkeypatch.setenv("RAG_EMBEDDER", "ollama")
    monkeypatch.setattr(embedders, "_embedder", None)
    try:
        emb = embedders.get_embedder()
        assert isinstance(emb, OllamaEmbedder)
        assert emb.dim == VECTOR_DIM
        assert emb.supports_multimodal is False
    finally:
        monkeypatch.setattr(embedders, "_embedder", None)
