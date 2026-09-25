"""Embedder de Gemini sin red: base configurable, lotes, dimensiones y reintentos."""

from types import SimpleNamespace
from urllib.parse import urlsplit

import pytest
from google.genai import errors

from rag.application.errors import EmbedderError
from rag.infrastructure import embedders
from rag.infrastructure.embedders import VECTOR_DIM, GeminiEmbedder, GeminiV1Embedder


class _FakeModels:
    """Sustituye a `client.models`: registra cada petición y responde en orden."""

    def __init__(self, replies=None, dim=VECTOR_DIM):
        self.calls: list[dict] = []
        self._replies = list(replies or [])
        self._dim = dim

    def embed_content(self, *, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self._replies:
            reply = self._replies.pop(0)
            if isinstance(reply, Exception):
                raise reply
        # v2 agrupa una lista de textos en UN vector; v1 da uno por texto.
        n = 1 if "embedding-2" in model else len(contents)
        return SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1] * self._dim) for _ in range(n)])


def _embedder(cls, monkeypatch, models):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-local")
    emb = cls()
    emb._client = SimpleNamespace(models=models)
    return emb


@pytest.fixture
def sleeps(monkeypatch):
    waited: list[float] = []
    monkeypatch.setattr(embedders.time, "sleep", waited.append)
    return waited


def _api_error(code: int) -> errors.APIError:
    cls = errors.ClientError if code < 500 else errors.ServerError
    return cls(code, {"error": {"code": code, "message": "simulado", "status": "X"}})


def test_gemini_api_base_apunta_el_sdk_a_otro_servidor(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-local")
    monkeypatch.setenv("GEMINI_API_BASE", "http://localhost:8300")
    emb = GeminiEmbedder()
    assert emb._client._api_client._http_options.base_url.startswith("http://localhost:8300")


def test_sin_gemini_api_base_usa_la_api_de_google(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-local")
    monkeypatch.delenv("GEMINI_API_BASE", raising=False)
    emb = GeminiEmbedder()
    host = urlsplit(emb._client._api_client._http_options.base_url).hostname
    assert host == "generativelanguage.googleapis.com"


def test_v2_manda_una_peticion_por_texto(monkeypatch):
    models = _FakeModels()
    out = _embedder(GeminiEmbedder, monkeypatch, models).embed_batch(["a", "b", "c"])
    assert len(out) == 3 and all(len(v) == VECTOR_DIM for v in out)
    assert [c["contents"] for c in models.calls] == [["a"], ["b"], ["c"]]
    assert models.calls[0]["config"].task_type == "RETRIEVAL_DOCUMENT"
    assert models.calls[0]["config"].output_dimensionality == VECTOR_DIM


def test_v1_manda_el_lote_en_una_peticion(monkeypatch):
    models = _FakeModels()
    out = _embedder(GeminiV1Embedder, monkeypatch, models).embed_batch(["a", "b", "c"])
    assert len(out) == 3
    assert [c["contents"] for c in models.calls] == [["a", "b", "c"]]


def test_dimension_distinta_de_la_columna_es_error_sin_reintentar(monkeypatch, sleeps):
    models = _FakeModels(dim=3072)
    emb = _embedder(GeminiV1Embedder, monkeypatch, models)
    with pytest.raises(EmbedderError, match="3072"):
        emb.embed_batch(["a"])
    assert len(models.calls) == 1 and sleeps == []
    with pytest.raises(EmbedderError, match="768"):
        emb.embed_query("consulta")


def test_error_4xx_no_se_reintenta(monkeypatch, sleeps):
    models = _FakeModels(replies=[_api_error(400)] * 4)
    with pytest.raises(EmbedderError, match="400"):
        _embedder(GeminiEmbedder, monkeypatch, models).embed_batch(["a"])
    assert len(models.calls) == 1 and sleeps == []


@pytest.mark.parametrize("code", [429, 503])
def test_cuota_y_5xx_se_reintentan_con_espera(monkeypatch, sleeps, code):
    models = _FakeModels(replies=[_api_error(code), _api_error(code)])
    out = _embedder(GeminiEmbedder, monkeypatch, models).embed_batch(["a"])
    assert len(out) == 1
    assert len(models.calls) == 3 and sleeps == [1, 2]


def test_error_persistente_se_rinde_tras_cuatro_intentos(monkeypatch, sleeps):
    models = _FakeModels(replies=[_api_error(503)] * 4)
    with pytest.raises(EmbedderError, match="503"):
        _embedder(GeminiEmbedder, monkeypatch, models).embed_batch(["a"])
    assert len(models.calls) == 4 and sleeps == [1, 2, 4]
