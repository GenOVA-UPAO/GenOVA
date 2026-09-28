"""Embedder de Gemini sin red: modelo, prefijos de v2, lotes, dimensiones y reintentos."""

import json
from types import SimpleNamespace
from urllib.parse import urlsplit

import pytest
from google.genai import errors

from rag.application.errors import EmbedderError
from rag.infrastructure import embed_retry
from rag.infrastructure.embedders import VECTOR_DIM, GeminiEmbedder, GeminiV1Embedder


class _FakeModels:
    """Sustituye a `client.models`: registra cada petición y responde en orden.

    Como la API real: un vector por `Content` de la lista."""

    def __init__(self, replies=None, dim=VECTOR_DIM, short_by=0):
        self.calls: list[dict] = []
        self._replies = list(replies or [])
        self._dim = dim
        self._short_by = short_by

    def embed_content(self, *, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        if self._replies:
            reply = self._replies.pop(0)
            if isinstance(reply, Exception):
                raise reply
        n = len(contents) - self._short_by
        return SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1] * self._dim) for _ in range(n)])


def _texts(call) -> list[str]:
    return [c.parts[0].text for c in call["contents"]]


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-local")
    for name in ("RAG_GEMINI_MODEL", "RAG_GEMINI_BATCH", "GEMINI_API_BASE"):
        monkeypatch.delenv(name, raising=False)
    for name in ("RAG_EMBED_RETRY_BUDGET_S", "RAG_EMBED_QUERY_RETRY_BUDGET_S"):
        monkeypatch.delenv(name, raising=False)


def _embedder(cls, models):
    emb = cls()
    emb._client = SimpleNamespace(models=models)
    return emb


@pytest.fixture
def sleeps(monkeypatch):
    waited: list[float] = []
    monkeypatch.setattr(embed_retry.time, "sleep", waited.append)
    # Jitter determinista: siempre el máximo del rango.
    monkeypatch.setattr(embed_retry.random, "uniform", lambda a, b: b)
    return waited


def _api_error(code: int, *, details=None, headers=None) -> errors.APIError:
    cls = errors.ClientError if code < 500 else errors.ServerError
    error = {"code": code, "message": "simulado", "status": "X"}
    if details:
        error["details"] = details
    response = SimpleNamespace(headers=headers or {})
    return cls(code, {"error": error}, response)


def test_gemini_api_base_apunta_el_sdk_a_otro_servidor(monkeypatch):
    monkeypatch.setenv("GEMINI_API_BASE", "http://localhost:8300")
    emb = GeminiEmbedder()
    assert emb._client._api_client._http_options.base_url.startswith("http://localhost:8300")


def test_sin_gemini_api_base_usa_la_api_de_google():
    emb = GeminiEmbedder()
    host = urlsplit(emb._client._api_client._http_options.base_url).hostname
    assert host == "generativelanguage.googleapis.com"


def test_por_defecto_usa_el_id_estable_de_v2():
    emb = GeminiEmbedder()
    assert emb.model_id == "gemini-embedding-2"
    assert emb.fingerprint == "gemini:gemini-embedding-2:768:prefix-v1"


def test_rag_gemini_model_sobrescribe_el_id(monkeypatch):
    monkeypatch.setenv("RAG_GEMINI_MODEL", "gemini-embedding-2-preview")
    emb = GeminiEmbedder()
    assert emb.model_id == "gemini-embedding-2-preview" and emb.is_v2
    assert emb.fingerprint == "gemini:gemini-embedding-2-preview:768:prefix-v1"


def test_con_modelo_v1_el_embedder_por_defecto_deja_de_ser_multimodal(monkeypatch):
    monkeypatch.setenv("RAG_GEMINI_MODEL", "gemini-embedding-001")
    emb = GeminiEmbedder()
    assert not emb.is_v2 and not emb.supports_multimodal
    monkeypatch.delenv("RAG_GEMINI_MODEL")
    assert GeminiV1Embedder().fingerprint == "gemini:gemini-embedding-001:768:task_type"


def test_v2_documentos_con_prefijo_sin_task_type_y_en_lotes():
    models = _FakeModels()
    texts = [f"t{i}" for i in range(70)]
    out = _embedder(GeminiEmbedder, models).embed_batch(texts)
    assert len(out) == 70 and all(len(v) == VECTOR_DIM for v in out)
    # 70 fragmentos = 3 peticiones (32 + 32 + 6), no 70.
    assert [len(c["contents"]) for c in models.calls] == [32, 32, 6]
    assert _texts(models.calls[0])[:2] == ["title: none | text: t0", "title: none | text: t1"]
    config = models.calls[0]["config"]
    assert config.task_type is None and config.output_dimensionality == VECTOR_DIM


def test_v2_consulta_con_prefijo_de_busqueda():
    models = _FakeModels()
    _embedder(GeminiEmbedder, models).embed_query("redes neuronales")
    assert _texts(models.calls[0]) == ["task: search result | query: redes neuronales"]
    assert models.calls[0]["config"].task_type is None


def test_tamano_de_lote_configurable(monkeypatch):
    monkeypatch.setenv("RAG_GEMINI_BATCH", "10")
    models = _FakeModels()
    _embedder(GeminiEmbedder, models).embed_batch(["x"] * 25)
    assert [len(c["contents"]) for c in models.calls] == [10, 10, 5]


def test_v1_sin_prefijos_y_con_task_type():
    models = _FakeModels()
    emb = _embedder(GeminiV1Embedder, models)
    assert len(emb.embed_batch(["a", "b", "c"])) == 3
    emb.embed_query("q")
    assert _texts(models.calls[0]) == ["a", "b", "c"]
    assert models.calls[0]["config"].task_type == "RETRIEVAL_DOCUMENT"
    assert _texts(models.calls[1]) == ["q"]
    assert models.calls[1]["config"].task_type == "RETRIEVAL_QUERY"


def test_archivo_multimodal_sin_prefijo_y_un_solo_content():
    models = _FakeModels()
    vec = _embedder(GeminiEmbedder, models).embed_file(b"%PDF-1.4", "application/pdf")
    assert len(vec) == VECTOR_DIM
    (content,) = models.calls[0]["contents"]
    assert content.parts[0].inline_data.mime_type == "application/pdf"


def test_menos_vectores_que_textos_es_error_sin_reintentar(sleeps):
    models = _FakeModels(short_by=1)
    with pytest.raises(EmbedderError, match="2 embeddings para 3"):
        _embedder(GeminiEmbedder, models).embed_batch(["a", "b", "c"])
    assert len(models.calls) == 1 and sleeps == []


def test_dimension_distinta_de_la_columna_es_error_sin_reintentar(sleeps):
    models = _FakeModels(dim=3072)
    emb = _embedder(GeminiV1Embedder, models)
    with pytest.raises(EmbedderError, match="3072"):
        emb.embed_batch(["a"])
    assert len(models.calls) == 1 and sleeps == []
    with pytest.raises(EmbedderError, match="768"):
        emb.embed_query("consulta")


def test_error_4xx_no_se_reintenta(sleeps):
    models = _FakeModels(replies=[_api_error(400)] * 4)
    with pytest.raises(EmbedderError, match="400"):
        _embedder(GeminiEmbedder, models).embed_batch(["a"])
    assert len(models.calls) == 1 and sleeps == []


@pytest.mark.parametrize("code", [429, 503])
def test_cuota_y_5xx_se_reintentan_con_espera_exponencial(sleeps, code):
    models = _FakeModels(replies=[_api_error(code), _api_error(code)])
    out = _embedder(GeminiEmbedder, models).embed_batch(["a"])
    assert len(out) == 1
    assert len(models.calls) == 3 and sleeps == [2.0, 4.0]


def test_respeta_retry_after_de_la_cabecera(sleeps):
    models = _FakeModels(replies=[_api_error(429, headers={"retry-after": "20"})])
    _embedder(GeminiEmbedder, models).embed_batch(["a"])
    assert sleeps == [21.0]  # 20 s pedidos + jitter (máx. 1 s)


def test_respeta_retry_info_del_cuerpo_de_google(sleeps):
    info = {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "37s"}
    models = _FakeModels(replies=[_api_error(429, details=[info])])
    _embedder(GeminiEmbedder, models).embed_batch(["a"])
    assert sleeps == [38.0]


def test_espera_pedida_mayor_que_el_presupuesto_se_abandona_sin_dormir(sleeps):
    models = _FakeModels(replies=[_api_error(429, headers={"retry-after": "120"})])
    with pytest.raises(EmbedderError, match="429"):
        _embedder(GeminiEmbedder, models).embed_batch(["a"])
    assert len(models.calls) == 1 and sleeps == []


def test_error_persistente_se_rinde_dentro_del_presupuesto(sleeps):
    models = _FakeModels(replies=[_api_error(503)] * 10)
    with pytest.raises(EmbedderError, match="503"):
        _embedder(GeminiEmbedder, models).embed_batch(["a"])
    # Techos 2, 4, 8, 16, 30 → suma 60 = presupuesto por defecto; 6 peticiones.
    assert sleeps == [2.0, 4.0, 8.0, 16.0, 30.0] and len(models.calls) == 6


def test_la_consulta_tiene_un_presupuesto_corto(sleeps):
    models = _FakeModels(replies=[_api_error(503)] * 10)
    with pytest.raises(EmbedderError):
        _embedder(GeminiEmbedder, models).embed_query("q")
    assert sum(sleeps) <= 8 and sleeps == [2.0, 4.0]


def test_el_sdk_manda_un_request_por_content_a_batch_embed_contents():
    """Comprueba con el SDK real (sin red) que una lista de Content no se agrega
    en un solo vector: va a batchEmbedContents con una petición por texto."""
    emb = GeminiEmbedder()
    sent: dict = {}

    def request(method, path, body, http_options=None):
        sent.update(path=path, body=body)
        embeddings = [{"values": [0.1] * VECTOR_DIM} for _ in body["requests"]]
        return SimpleNamespace(body=json.dumps({"embeddings": embeddings}), headers={})

    emb._client._api_client.request = request
    out = emb.embed_batch(["uno", "dos", "tres"])
    assert len(out) == 3
    assert sent["path"].endswith("gemini-embedding-2:batchEmbedContents")
    requests = sent["body"]["requests"]
    assert [r["content"]["parts"][0]["text"] for r in requests] == [
        "title: none | text: uno",
        "title: none | text: dos",
        "title: none | text: tres",
    ]
    assert all("taskType" not in r and r["outputDimensionality"] == VECTOR_DIM for r in requests)
