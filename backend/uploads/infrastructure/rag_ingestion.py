"""Adaptador de ingesta RAG: implementa RagIngestionPort sobre `rag.pipeline`.

Único punto del paquete `uploads` que conoce el dominio `rag`.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from uploads.application.dto import RagStatus


class RagIngestionAdapter:
    def __init__(self, db: Session) -> None:
        self._db = db

    def is_enabled(self) -> bool:
        from rag import is_enabled

        return is_enabled()

    def ingest(
        self, *, user_id: str, upload_id: str, storage_path: str, filename: str
    ) -> RagStatus:
        from rag import ingest_upload

        raw = ingest_upload(
            self._db,
            user_id=user_id,
            upload_id=upload_id,
            storage_path=storage_path,
            filename=filename,
        )
        return RagStatus(
            status=str(raw.get("status", "error")),
            chunks=int(raw.get("chunks", 0)),
            message=raw.get("message"),
        )
