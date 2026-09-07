"""Composition root del dominio RAG."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from rag.application.use_cases import IngestDocument, RetrieveChunks
from rag.infrastructure.embedders import get_embedder
from rag.infrastructure.parsers import FileTextExtractor
from rag.infrastructure.pgvector_store import PgVectorChunkStore


@dataclass(frozen=True, slots=True)
class RagUseCases:
    ingest_document: IngestDocument
    retrieve_chunks: RetrieveChunks


def build_rag(db: Session = Depends(get_db)) -> RagUseCases:
    embedder = get_embedder()
    store = PgVectorChunkStore(db)
    return RagUseCases(
        ingest_document=IngestDocument(embedder, store, FileTextExtractor()),
        retrieve_chunks=RetrieveChunks(embedder, store),
    )
