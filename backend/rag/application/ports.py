"""Puertos de la capa de aplicación de RAG."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol
from uuid import UUID


class EmbedderPort(Protocol):
    """Genera embeddings. La implementación (Gemini / local) vive en infrastructure.

    Las implementaciones reales exponen además ``fingerprint`` (str): qué modelo
    y formato de entrada produjo los vectores (se guarda en cada fragmento)."""

    def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class ChunkStorePort(Protocol):
    """Persistencia y búsqueda de chunks sobre pgvector."""

    def insert_chunks(
        self,
        *,
        user_id: UUID | str,
        upload_id: UUID | str,
        source_filename: str,
        chunks: list[str],
        embeddings: list[list[float]],
        ttl_seconds: int = 3600,
        embedding_model: str | None = None,
    ) -> int: ...

    def search(
        self, query_embedding: list[float], upload_ids: Sequence[str], k: int
    ) -> list[dict]: ...

    def search_hybrid(
        self,
        query_text: str,
        query_embedding: list[float] | None,
        upload_ids: Sequence[str],
        k: int,
        candidate_k: int = 20,
    ) -> list[dict]:
        """Recuperación híbrida (RRF). ``query_embedding`` puede ser None →
        solo rama léxica."""
        ...

    def tie_uploads_to_ova(self, upload_ids: Sequence[str], ova_id: str) -> int: ...

    def purge_expired(self) -> int: ...

    def chunks_for_upload(self, upload_id: str) -> list[dict]: ...


class ReindexStorePort(Protocol):
    """Lectura y reescritura de vectores para reindexar tras cambiar de embedder."""

    def count_by_embedding_model(self, *, upload_id: str | None = None) -> dict[str | None, int]:
        """Fragmentos por `embedding_model` (None = sin registrar, anteriores a
        la columna)."""
        ...

    def stale_chunks(
        self, fingerprint: str, *, after_id: str | None, limit: int, upload_id: str | None = None
    ) -> list[dict]:
        """Hasta ``limit`` fragmentos (``id``, ``content``) cuyo
        ``embedding_model`` no es ``fingerprint``, en orden de id y después de
        ``after_id`` (paginación estable aunque no se actualicen)."""
        ...

    def update_embeddings(
        self, rows: list[tuple[str, list[float]]], fingerprint: str
    ) -> int:
        """Reescribe vector y ``embedding_model`` de esos ids y confirma."""
        ...


class TextExtractorPort(Protocol):
    def detect_kind(self, filename: str) -> str | None: ...

    def extract_text(self, storage_path: str, *, filename: str) -> str: ...
