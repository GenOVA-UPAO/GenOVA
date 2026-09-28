"""Caso de uso: indexar para el RAG un archivo ya subido (en segundo plano)."""

from __future__ import annotations

from dataclasses import dataclass

import structlog

from uploads.application.dto import RagStatus
from uploads.application.ports import RagIngestionPort, TempUploadRepository
from uploads.domain.policies import ingestion_message

logger = structlog.get_logger(__name__)


@dataclass(frozen=True, slots=True)
class IngestUpload:
    repo: TempUploadRepository
    rag: RagIngestionPort

    def execute(self, user_id: str, upload_id: str) -> RagStatus:
        """Nunca lanza: el resultado (también el fallo, con su motivo) queda en el
        `rag_status` de la subida, que es lo que consulta la interfaz."""
        status = self._ingest(user_id, upload_id)
        self.repo.set_rag_status(upload_id, status.as_dict())
        return status

    def _ingest(self, user_id: str, upload_id: str) -> RagStatus:
        if not self.rag.is_enabled():
            return RagStatus(status="disabled")
        upload = self.repo.get(upload_id, user_id)
        storage_path = self.repo.get_storage_path(upload_id, user_id)
        if upload is None or not storage_path:
            # Borrada (o caducada) antes de indexarse: nada que hacer.
            return RagStatus(status="skipped", reason="upload_gone")
        try:
            raw = self.rag.ingest(
                user_id=user_id,
                upload_id=upload_id,
                storage_path=storage_path,
                filename=upload.filename or "archivo",
            )
        except Exception:  # noqa: BLE001 — la ingesta nunca rompe la subida
            logger.exception("RAG ingestion falló", filename=upload.filename)
            raw = RagStatus(status="error", reason="unexpected")
        message = raw.message or ingestion_message(raw.status, raw.reason)
        return RagStatus(status=raw.status, chunks=raw.chunks, message=message, reason=raw.reason)
