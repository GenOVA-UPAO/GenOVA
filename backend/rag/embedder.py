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
"""
from __future__ import annotations

import logging
import os
import time
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)

VECTOR_DIM = 768  # Matches the pgvector(768) column in migration 011.


class EmbedderError(RuntimeError):
    pass


class Embedder(ABC):
    name: str
    dim: int

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts. Returns vectors aligned with input order."""


class _GeminiEmbedderBase(Embedder):
    """Shared core for Gemini embedding models (text input)."""

    name = "gemini"
    dim = VECTOR_DIM
    model_id: str = "gemini-embedding-2-preview"
    supports_multimodal: bool = True

    def __init__(self) -> None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            raise EmbedderError("GEMINI_API_KEY is not set")
        try:
            from google import genai  # type: ignore
            from google.genai import types  # type: ignore
        except ImportError as exc:
            raise EmbedderError(
                "google-genai is not installed (pip install google-genai)"
            ) from exc
        self._client = genai.Client(api_key=api_key)
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
        return [list(item.values) for item in resp.embeddings]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = []
        for i in range(0, len(texts), 32):
            batch = texts[i : i + 32]
            for attempt in range(4):
                try:
                    out.extend(self._call(batch, "RETRIEVAL_DOCUMENT"))
                    break
                except Exception as exc:
                    delay = 2 ** attempt
                    logger.warning(
                        "Gemini embedding retry %s/4 in %ss: %s",
                        attempt + 1,
                        delay,
                        exc,
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


_embedder: Embedder | None = None


def get_embedder() -> Embedder:
    """Lazy singleton. Choose backend via RAG_EMBEDDER env (default 'gemini')."""
    global _embedder
    if _embedder is not None:
        return _embedder
    choice = os.getenv("RAG_EMBEDDER", "gemini").strip().lower()
    if choice == "local":
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
