"""Pluggable embedder. Default backend is Google's `gemini-embedding-2`
(estable; vía el SDK `google-genai`), truncado (Matryoshka) a 768 d para la
columna de pgvector. `RAG_GEMINI_MODEL` cambia el id (p. ej. el antiguo
`gemini-embedding-2-preview`); `RAG_EMBEDDER=gemini-001` usa `gemini-embedding-001`.

Why v2: it is **natively multimodal** — same model embeds text, images
(PNG/JPEG), PDFs (up to 6 pages w/ OCR), audio and video. Replaces the need for
separate Whisper transcription + vision captioning + PDF text extraction before
the embedding step.

Diferencias de v2 que este módulo respeta (documentación de Gemini,
ai.google.dev/gemini-api/docs/embeddings, sep-2026):

- «With `gemini-embedding-2`, the `task_type` parameter is not supported.» La
  tarea va como prefijo en el texto: documentos `title: none | text: …` y
  consultas `task: search result | query: …`. Al archivo multimodal no se le
  pone prefijo (la guía lo desaconseja para entradas multimodales). v1 sigue
  con `task_type` (RETRIEVAL_DOCUMENT / RETRIEVAL_QUERY).
- Varias partes en un mismo `Content` dan UN vector agregado; cada texto en su
  propio `types.Content` da un vector por texto en una sola petición
  (`batchEmbedContents`). Por eso los fragmentos van en lotes de Content.
- Los espacios de v1 y v2 son incompatibles: cambiar de modelo o de prefijos
  obliga a re-embeber. Cada fragmento guarda `embedding_model` (la
  `fingerprint` del embedder) y `scripts/reindex_rag.py` re-embebe los que no
  coinciden.

Set `RAG_EMBEDDER=local` to use sentence-transformers (only if Render RAM
allows — ~120 MB extra footprint).

`RAG_EMBEDDER=ollama` usa un servidor Ollama (`OLLAMA_URL`, por defecto
http://localhost:11434) con `nomic-embed-text` (768 d): es la opción para
desarrollo local sin clave de Gemini.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any

import structlog

from rag.application.errors import EmbedderError
from rag.infrastructure.embed_retry import (
    RetryPolicy,
    call_with_retry,
    document_policy,
    query_policy,
)

logger = structlog.get_logger(__name__)

VECTOR_DIM = 768  # Matches the pgvector(768) column in migration 011.

__all__ = ["Embedder", "EmbedderError", "OllamaEmbedder", "get_embedder", "vector_dim"]


class Embedder(ABC):
    name: str
    dim: int

    @property
    def fingerprint(self) -> str:
        """Qué produjo los vectores (modelo, dimensión, formato de entrada). Se
        guarda en cada fragmento: si cambia, sus vectores ya no son comparables
        con las consultas nuevas y hay que reindexarlos."""
        return f"{self.name}:{self.dim}"

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Returns vectors aligned with input order."""


# Formato de entrada de v2 (versionado: cambiarlo invalida los vectores guardados).
_V2_SCHEME = "prefix-v1"
_V2_DOC = "title: none | text: {}"
_V2_QUERY = "task: search result | query: {}"


def _batch_size() -> int:
    # batchEmbedContents admite como mucho 100 peticiones por llamada.
    try:
        return max(1, min(100, int(os.getenv("RAG_GEMINI_BATCH", "32"))))
    except ValueError:
        return 32


class _GeminiEmbedderBase(Embedder):
    """Shared core for Gemini embedding models (text input)."""

    name = "gemini"
    dim = VECTOR_DIM
    default_model: str = "gemini-embedding-2"
    supports_multimodal: bool = True

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise EmbedderError("GEMINI_API_KEY is not set")
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
        except ImportError as exc:
            raise EmbedderError("google-genai is not installed (pip install google-genai)") from exc
        self.model_id = os.getenv("RAG_GEMINI_MODEL", "").strip() or self.default_model
        # Solo v2 es multimodal: con RAG_GEMINI_MODEL=gemini-embedding-001 los
        # PDF/imágenes vuelven a la extracción de texto.
        self.supports_multimodal = type(self).supports_multimodal and self.is_v2
        # GEMINI_API_BASE apunta el SDK a un servidor compatible (el OpenRouter
        # simulado de scripts/fake_openrouter también responde como Gemini).
        base = os.getenv("GEMINI_API_BASE", "").strip()
        options = {"http_options": types.HttpOptions(base_url=base)} if base else {}
        self._client = genai.Client(api_key=api_key, **options)
        self._types = types

    @property
    def is_v2(self) -> bool:
        # Mismo criterio que el SDK para tratar el modelo como v2.
        return "gemini-embedding-2" in self.model_id

    @property
    def fingerprint(self) -> str:
        scheme = _V2_SCHEME if self.is_v2 else "task_type"
        return f"gemini:{self.model_id}:{self.dim}:{scheme}"

    def _config(self, task_type: str) -> Any:
        if self.is_v2:  # v2 no admite task_type: la tarea va en el prefijo
            return self._types.EmbedContentConfig(output_dimensionality=self.dim)
        return self._types.EmbedContentConfig(task_type=task_type, output_dimensionality=self.dim)

    def _text_contents(self, texts: list[str], template: str) -> list:
        """Un `Content` por texto: así v2 devuelve un vector por texto (varias
        partes en un solo Content, o una lista de str, dan UN vector agregado)."""
        fmt = template if self.is_v2 else "{}"
        part = self._types.Part.from_text
        return [self._types.Content(parts=[part(text=fmt.format(t))]) for t in texts]

    def _call(self, contents: list, task_type: str) -> list[list[float]]:
        resp = self._client.models.embed_content(
            model=self.model_id,
            contents=contents,
            config=self._config(task_type),
        )
        vectors = [list(item.values) for item in resp.embeddings or []]
        if len(vectors) != len(contents):
            raise EmbedderError(
                f"{self.model_id} devolvió {len(vectors)} embeddings para {len(contents)} entradas"
            )
        # Sin esta comprobación, un vector de otra dimensión (el API ignora
        # `output_dimensionality`, o cambia el modelo) llegaba a pgvector: la
        # ingesta acababa como `db_error` y la consulta vaciaba la búsqueda.
        wrong = next((len(v) for v in vectors if len(v) != self.dim), None)
        if wrong is not None:
            raise EmbedderError(
                f"{self.model_id} devolvió vectores de {wrong} dimensiones; "
                f"la columna es de {self.dim}"
            )
        return vectors

    def _call_retrying(self, contents: list, task_type: str, policy: RetryPolicy) -> list[list[float]]:
        return call_with_retry(
            lambda: self._call(contents, task_type),
            policy=policy,
            what=f"Gemini embedding ({self.model_id})",
        )

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # Lotes de Content: 100 fragmentos son 4 peticiones en vez de 100 (y
        # 100 peticiones agotaban enseguida la cuota por minuto).
        step = _batch_size()
        policy = document_policy()
        out: list[list[float]] = []
        for i in range(0, len(texts), step):
            contents = self._text_contents(texts[i : i + step], _V2_DOC)
            out.extend(self._call_retrying(contents, "RETRIEVAL_DOCUMENT", policy))
        return out

    def embed_query(self, text: str) -> list[float]:
        contents = self._text_contents([text], _V2_QUERY)
        return self._call_retrying(contents, "RETRIEVAL_QUERY", query_policy())[0]


class GeminiEmbedder(_GeminiEmbedderBase):
    """Default: gemini-embedding-2. Supports text + multimodal binary."""

    default_model = "gemini-embedding-2"
    supports_multimodal = True

    def embed_file(self, data: bytes, mime_type: str) -> list[float]:
        """Embed a binary file (PDF, image, audio, video) directly. Returns
        ONE vector for the whole file — v2 produces a single embedding per
        Content regardless of internal pages/frames.

        Caller passes raw bytes + the IANA mime type. Caller is responsible
        for size limits (Gemini v2 caps: 6 imgs/req, 6 PDF pages/req,
        120 s video, 8192 input tokens).
        """
        if not self.supports_multimodal:
            raise EmbedderError("This embedder does not support multimodal input")
        part = self._types.Part.from_bytes(data=data, mime_type=mime_type)
        content = self._types.Content(parts=[part])
        return self._call_retrying([content], "RETRIEVAL_DOCUMENT", document_policy())[0]


class GeminiV1Embedder(_GeminiEmbedderBase):
    """Stable fallback: gemini-embedding-001 (GA, text-only, con task_type).
    Set RAG_EMBEDDER=gemini-001 to activate."""

    default_model = "gemini-embedding-001"
    supports_multimodal = False


class LocalEmbedder(Embedder):
    name = "local"
    dim = 384

    def __init__(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
        except ImportError as exc:
            raise EmbedderError("sentence-transformers is not installed") from exc
        model_name = os.getenv("RAG_LOCAL_MODEL", "all-MiniLM-L6-v2")
        self._model = SentenceTransformer(model_name)
        self._model_name = model_name

    @property
    def fingerprint(self) -> str:
        return f"local:{self._model_name}:{self.dim}"

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [list(map(float, v)) for v in vectors]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]


class OllamaEmbedder(Embedder):
    """Embeddings servidos por Ollama (`RAG_EMBEDDER=ollama`), pensado para
    desarrollo local sin clave de Gemini: `nomic-embed-text` da vectores de 768 d,
    la dimensión de la columna, así que no hace falta migrar el esquema.

    `nomic-embed-text` es asimétrico: los documentos y las consultas llevan un
    prefijo de tarea distinto (`search_document:` / `search_query:`); sin él la
    recuperación pierde bastante precisión. Solo texto: los PDF, DOCX y PPTX pasan
    por la extracción de texto de siempre.
    """

    name = "ollama"
    dim = VECTOR_DIM
    supports_multimodal = False
    _BATCH = 32
    _DOC_PREFIX = "search_document: "
    _QUERY_PREFIX = "search_query: "

    def __init__(self) -> None:
        self._url = os.getenv("OLLAMA_URL", "http://localhost:11434").strip().rstrip("/")
        self._model = os.getenv("RAG_OLLAMA_MODEL", "nomic-embed-text").strip()
        self._timeout = float(os.getenv("RAG_OLLAMA_TIMEOUT_S", "60"))

    @property
    def fingerprint(self) -> str:
        return f"ollama:{self._model}:{self.dim}:nomic-prefix"

    def _call(self, texts: list[str]) -> list[list[float]]:
        import httpx

        try:
            resp = httpx.post(
                f"{self._url}/api/embed",
                json={"model": self._model, "input": texts},
                timeout=self._timeout,
            )
            resp.raise_for_status()
            vectors = resp.json().get("embeddings") or []
        except (httpx.HTTPError, ValueError) as exc:
            raise EmbedderError(f"Ollama ({self._url}, {self._model}) no respondió: {exc}") from exc
        if len(vectors) != len(texts):
            raise EmbedderError(
                f"Ollama devolvió {len(vectors)} embeddings para {len(texts)} textos"
            )
        if any(len(v) != self.dim for v in vectors):
            raise EmbedderError(
                f"El modelo {self._model} no da vectores de {self.dim} dimensiones; "
                "usa nomic-embed-text u otro de 768 d"
            )
        return [list(map(float, v)) for v in vectors]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), self._BATCH):
            batch = texts[i : i + self._BATCH]
            out.extend(self._call([self._DOC_PREFIX + t for t in batch]))
        return out

    def embed_query(self, text: str) -> list[float]:
        return self._call([self._QUERY_PREFIX + text])[0]


_embedder: Embedder | None = None


def get_embedder() -> Embedder:
    """Lazy singleton. Choose backend via RAG_EMBEDDER env (default 'gemini')."""
    global _embedder
    if _embedder is not None:
        return _embedder
    choice = os.getenv("RAG_EMBEDDER", "gemini").strip().lower()
    if choice == "ollama":
        _embedder = OllamaEmbedder()
    elif choice == "local":
        _embedder = LocalEmbedder()
    elif choice in ("gemini-001", "gemini-v1"):
        _embedder = GeminiV1Embedder()
    else:
        _embedder = GeminiEmbedder()
    return _embedder


def vector_dim() -> int:
    """Return the vector dimension of the active embedder. Used by the retriever
    to validate schema/embedding compatibility."""
    try:
        return get_embedder().dim
    except EmbedderError:
        return VECTOR_DIM
