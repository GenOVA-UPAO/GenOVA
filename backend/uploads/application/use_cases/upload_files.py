"""Caso de uso: subir uno o varios documentos temporales (con ingesta RAG best-effort)."""

from __future__ import annotations

from dataclasses import dataclass

import structlog

from uploads.application.dto import (
    IncomingFile,
    RagStatus,
    UploadFileError,
    UploadItemView,
    UploadOutcome,
)
from uploads.application.ports import RagIngestionPort, TempUploadRepository, UploadLimits
from uploads.application.views import to_view
from uploads.domain.errors import (
    ContentMismatch,
    FilesRequired,
    FileTooLarge,
    MimeNotAllowed,
    TooManyFiles,
    UploadError,
)
from uploads.domain.policies import is_allowed_mime, magic_bytes_ok, safe_filename

logger = structlog.get_logger(__name__)

_RAG_DISABLED = RagStatus(status="disabled", chunks=0)
_RAG_ERROR = RagStatus(
    status="error", chunks=0, message="El archivo se subió pero no pudo indexarse para RAG."
)


@dataclass(frozen=True, slots=True)
class UploadFiles:
    repo: TempUploadRepository
    rag: RagIngestionPort
    limits: UploadLimits

    def execute(self, user_id: str, files: list[IncomingFile]) -> UploadOutcome:
        max_files = self.limits.max_files_per_request()
        self._reject_batch(user_id, files, max_files)

        max_bytes = self.limits.max_file_size_bytes()
        max_mb = self.limits.max_file_size_mb()
        items: list[UploadItemView] = []
        errors: list[UploadFileError] = []
        for incoming in files:
            try:
                items.append(self._process_file(user_id, incoming, max_bytes, max_mb))
            except UploadError as err:
                errors.append(
                    UploadFileError(
                        filename=incoming.filename or "archivo", error=err.code, message=str(err)
                    )
                )
        return UploadOutcome(items=items, errors=errors, max_files=max_files, max_size_mb=max_mb)

    def _reject_batch(self, user_id: str, files: list[IncomingFile], max_files: int) -> None:
        if not files:
            raise FilesRequired()
        if len(files) > max_files:
            raise TooManyFiles(max_files)
        if self.repo.count_active(user_id) + len(files) > max_files:
            raise TooManyFiles(max_files, total=True)

    def _process_file(
        self, user_id: str, incoming: IncomingFile, max_bytes: int, max_mb: int
    ) -> UploadItemView:
        mime = (incoming.content_type or "").strip().lower()
        if not is_allowed_mime(mime):
            raise MimeNotAllowed()
        if len(incoming.content) > max_bytes:
            raise FileTooLarge(max_mb)
        if not magic_bytes_ok(mime, incoming.content):
            raise ContentMismatch()

        upload = self.repo.create(
            user_id, safe_filename(incoming.filename), mime, incoming.content
        )
        rag_status = self._ingest(user_id, upload.upload_id, upload.filename)
        self.repo.set_rag_status(upload.upload_id, rag_status.as_dict())
        return to_view(upload, rag_status=rag_status.as_dict())

    def _ingest(self, user_id: str, upload_id: str, filename: str) -> RagStatus:
        if not self.rag.is_enabled():
            return _RAG_DISABLED
        storage_path = self.repo.get_storage_path(upload_id, user_id)
        if not storage_path:
            return _RAG_DISABLED
        try:
            return self.rag.ingest(
                user_id=user_id,
                upload_id=upload_id,
                storage_path=storage_path,
                filename=filename or "archivo",
            )
        except Exception:  # noqa: BLE001 — RAG nunca bloquea el upload
            logger.exception("RAG ingestion falló", filename=filename)
            return _RAG_ERROR
