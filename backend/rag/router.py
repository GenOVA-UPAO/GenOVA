"""Debug + health endpoints for the RAG subsystem. Ingestion happens via
`/api/uploads/temp`; retrieval is invoked from the generation routers."""

from __future__ import annotations

import os

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from models import User
from rag.embedder import vector_dim
from rag.store import chunks_for_upload

router = APIRouter()


@router.get("/health")
def rag_health(db: Session = Depends(get_db)) -> dict:
    embedder_name = os.getenv("RAG_EMBEDDER", "gemini").lower()
    try:
        pgvector_ready = bool(
            db.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")).first()
        )
    except Exception:
        pgvector_ready = False
    return {
        "module": "rag",
        "status": "ok",
        "embedder": embedder_name,
        "vector_dim": vector_dim(),
        "pgvector_ready": pgvector_ready,
    }


@router.get("/chunks/by-upload/{upload_id}")
def list_chunks_by_upload(
    upload_id: str,
    current_user: User = Depends(get_current_user),  # noqa: ARG001  (auth only)
    db: Session = Depends(get_db),
) -> dict:
    return {"items": chunks_for_upload(db, upload_id)}
