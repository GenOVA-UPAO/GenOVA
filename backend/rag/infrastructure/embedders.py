"""Pluggable embedder. Default backend is Google's
`gemini-embedding-2-preview` (via the new `google-genai` SDK), Matryoshka-
truncated to 768-d so it fits the pgvector schema. Free tier rate limits
identical or more generous than `gemini-embedding-001`.

Why v2-preview: it is **natively multimodal** — same model embeds text,
images (PNG/JPEG), PDFs (up to 6 pages w/ OCR), audio and video. Replaces the
need for separate Whisper transcription + vision captioning + PDF text
extraction before the embedding step.

Note: `text-embedding-004` was deprecated 14-Jan-2026. The Preview model is
in Public Preview status — fallback to v1 via `RAG_EMBEDDER=gemini-001` if
needed.

Set `RAG_EMBEDDER=local` to use sentence-transformers (only if Render RAM
allows — ~120 MB extra footprint).

`RAG_EMBEDDER=ollama` usa un servidor Ollama (`OLLAMA_URL`, por defecto
http://localhost:11434) con `nomic-embed-text` (768 d): es la opción para
desarrollo local sin clave de Gemini.
"""

from __future__ import annotations

import os
import time
from abc import ABC, abstractmethod
from typing import Any

import structlog

from rag.application.errors import EmbedderError

logger = structlog.get_logger(__name__)

VECTOR_DIM = 768  # Matches the pgvector(768) column in migration 011.

__all__ = ["Embedder", "EmbedderError", "OllamaEmbedder", "get_embedder", "vector_dim"]


class Embedder(ABC):
    name: str
    dim: int

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Returns vectors aligned with input order."""


def _is_transient(exc: Exception) -> bool:
    """¿Puede salir bien al repetir? Sí: red, 5xx, 408 y 429 (cuota por minuto)."""
    if isinstance(exc, EmbedderError):
        return False
    code = getattr(exc, "code", None)  # google.genai.errors.APIError
    return not (isinstance(code, int) and 400 <= code < 500 and code not in (408, 429))


class _GeminiEmbedderBase(Embedder):
    """Shared core for Gemini embedding models (text input)."""

    name = "gemini"
    dim = VECTOR_DIM
    model_id: str = "gemini-embedding-2-preview"
    supports_multimodal: bool = True
    # ¿Una petición con N contents devuelve N embeddings? v2 NO: trata la lista
    # como un único documento multi-parte y responde con un solo vector (ver
    # GeminiEmbedder). v1 sí batchea de verdad.
    supports_batch: bool = True

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise EmbedderError("GEMINI_API_KEY is not set")
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
        except ImportError as exc:
            raise EmbedderError("google-genai is not installed (pip install google-genai)") from exc
        # GEMINI_API_BASE apunta el SDK a un servidor compatible (el OpenRouter
        # simulado de scripts/fake_openrouter también responde como Gemini).
        base = os.getenv("GEMINI_API_BASE", "").strip()
        options = {"http_options": types.HttpOptions(base_url=base)} if base else {}
        self._client = genai.Client(api_key=api_key, **options)
        self._types = types

    def _config(self, task_type: str) -> Any:
        return self._types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=self.dim,
        )

    def _call(self, contents: list, task_type: str) -> list[list[float]]:
        resp = self._client.models.embed_content(
            model=self.model_id,
            contents=contents,
            config=self._config(task_type),
        )
        vectors = [list(item.values) for item in resp.embeddings]
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

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # Con `supports_batch=False` cada texto va en su propia petición: agrupar
        # devolvía UN vector para todo el lote y luego `insert_chunks` reventaba con
        # "chunks and embeddings must be the same length", así que la ingesta de
        # cualquier documento de más de un chunk fallaba entera.
        step = 32 if self.supports_batch else 1
        out: list[list[float]] = []
        for i in range(0, len(texts), step):
            batch = texts[i : i + step]
            for attempt in range(4):
                try:
                    vectors = self._call(batch, "RETRIEVAL_DOCUMENT")
                    if len(vectors) != len(batch):
                        raise EmbedderError(
                            f"{self.model_id} devolvió {len(vectors)} embeddings "
                            f"para {len(batch)} textos"
                        )
                    out.extend(vectors)
                    break
                except Exception as exc:
                    # Un 4xx (clave inválida, petición mal formada) o un vector
                    # inservible no cambian al repetir: se reintentaba 4 veces y
                    # la subida esperaba 7 s para fallar igual.
                    if not _is_transient(exc):
                        raise EmbedderError(f"Gemini embedding failed: {exc}") from exc
                    delay = 2**attempt
                    logger.warning(
                        "Gemini embedding retry",
                        attempt=attempt + 1,
                        max_attempts=4,
                        delay_s=delay,
                        error=str(exc),
                    )
                    if attempt == 3:
                        raise EmbedderError(f"Gemini embedding failed: {exc}") from exc
                    time.sleep(delay)
        return out

    def embed_query(self, text: str) -> list[float]:
        return self._call([text], "RETRIEVAL_QUERY")[0]


class GeminiEmbedder(_GeminiEmbedderBase):
    """Default: gemini-embedding-2-preview. Supports text + multimodal binary."""

    model_id = "gemini-embedding-2-preview"
    supports_multimodal = True
    # v2 produce UN embedding por petición aunque reciba varios contents (es la
    # misma semántica que aprovecha embed_file para un PDF de varias páginas).
    supports_batch = False

    def embed_file(self, data: bytes, mime_type: str) -> list[float]:
        """Embed a binary file (PDF, image, audio, video) directly. Returns
        ONE vector for the whole file — v2 produces a single embedding per
        Part regardless of internal pages/frames.

        Caller passes raw bytes + the IANA mime type. Caller is responsible
        for size limits (Gemini v2 caps: 6 imgs/req, 6 PDF pages/req,
        120 s video, 8192 input tokens).
        """
        if not self.supports_multimodal:
            raise EmbedderError("This embedder does not support multimodal input")
        part = self._types.Part.from_bytes(data=data, mime_type=mime_type)
        return self._call([part], "RETRIEVAL_DOCUMENT")[0]


class GeminiV1Embedder(_GeminiEmbedderBase):
    """Stable fallback: gemini-embedding-001 (GA, text-only). Use when the v2
    Preview is unstable. Set RAG_EMBEDDER=gemini-001 to activate."""

    model_id = "gemini-embedding-001"
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
