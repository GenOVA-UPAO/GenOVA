"""Caso de uso: recuperar los top-k chunks relevantes para una consulta."""

from __future__ import annotations

import os
from collections.abc import Sequence
from dataclasses import dataclass

import structlog

from rag.application.errors import EmbedderError
from rag.application.ports import ChunkStorePort, EmbedderPort

logger = structlog.get_logger(__name__)

# 8 = justo lo que llena el presupuesto de contexto por defecto
# (RAG_MAX_CONTEXT_CHARS=6000 con chunks de ~800 chars dan ~7 bloques); con 5
# quedaba ~1/3 del presupuesto sin usar (medido: 4.255/6.000 chars) y el
# recall@5 era 0.60 frente a 0.76 con k=8 en la comparación con corpus real.
DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "8"))

# Caché simple en memoria: (query, tuple(upload_ids)) -> list[dict]
_retrieval_cache: dict[tuple[str, tuple[str, ...]], list[dict]] = {}
_MAX_RETRIEVAL_CACHE = 100


@dataclass(frozen=True, slots=True)
class RetrieveChunks:
    embedder: EmbedderPort
    store: ChunkStorePort

    def execute(
        self, query: str, upload_ids: Sequence[str], k: int = DEFAULT_TOP_K
    ) -> list[dict]:
        if not upload_ids or not query.strip():
            return []

        cache_key = (query.strip(), tuple(sorted(upload_ids)))
        cached = _retrieval_cache.get(cache_key)
        if cached is not None:
            logger.info("RAG retrieval cache hit", query_preview=query[:60])
            return cached

        embedding = self._embed_query(query)
        # La búsqueda es híbrida (RRF): si el embedder falla, la rama léxica
        # sigue funcionando (embedding=None → solo léxica). Best-effort.
        result = self.store.search_hybrid(query, embedding, upload_ids, k)
        if len(_retrieval_cache) >= _MAX_RETRIEVAL_CACHE:
            _retrieval_cache.pop(next(iter(_retrieval_cache)))
        _retrieval_cache[cache_key] = result
        return result

    def _embed_query(self, query: str) -> list[float] | None:
        try:
            embed_query = getattr(self.embedder, "embed_query", None)
            if callable(embed_query):
                return embed_query(query)
            return self.embedder.embed_batch([query])[0]
        except EmbedderError:
            logger.exception("Embedder no disponible; contexto RAG vacío")
            return None
        except Exception:
            logger.exception("Fallo al generar embedding de la consulta; contexto RAG vacío")
            return None
