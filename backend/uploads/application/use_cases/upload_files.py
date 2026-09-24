"""Caso de uso: subir uno o varios documentos temporales.

La ingesta RAG (parse → chunk → embed → pgvector) ya no se hace dentro de la
petición: el archivo queda en `processing` y el adaptador HTTP lanza
`IngestUpload` en segundo plano. Así el docente ve «subiendo» y luego
«indexando» como estados distintos, y un PDF largo no deja la petición colgada
mientras se calculan sus embeddings.
"""

from __future__ import annotations

from dataclasses import dataclass

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

_RAG_DISABLED = RagStatus(status="disabled", chunks=0)
_RAG_PROCESSING = RagStatus(status="processing", chunks=0)


@dataclass(frozen=True, slots=True)
class UploadFiles:
    repo: TempUploadRepository
    rag: RagIngestionPort
    limits: UploadLimits

    def execute(
        self, user_id: str, files: list[IncomingFile], ova_id: str | None = None
    ) -> UploadOutcome:
        max_files = self.limits.max_files_per_request()
        self._reject_batch(user_id, files, max_files, ova_id)

        max_bytes = self.limits.max_file_size_bytes()
        max_mb = self.limits.max_file_size_mb()
        items: list[UploadItemView] = []
        errors: list[UploadFileError] = []
        for incoming in files:
            try:
                items.append(self._process_file(user_id, incoming, max_bytes, max_mb, ova_id))
            except UploadError as err:
                errors.append(
                    UploadFileError(
                        filename=incoming.filename or "archivo", error=err.code, message=str(err)
                    )
                )
        pending = [
            v.upload_id for v in items if (v.rag_status or {}).get("status") == "processing"
        ]
        return UploadOutcome(
            items=items,
            errors=errors,
            max_files=max_files,
            max_size_mb=max_mb,
            pending_ingestion=pending,
        )

    def _reject_batch(
        self, user_id: str, files: list[IncomingFile], max_files: int, ova_id: str | None
    ) -> None:
        if not files:
            raise FilesRequired()
        if len(files) > max_files:
            raise TooManyFiles(max_files)
        # El tope es por lista: los adjuntos del chat de un OVA no restan hueco al
        # formulario de crear ni a los de otro OVA.
        if self.repo.count_active(user_id, ova_id) + len(files) > max_files:
            raise TooManyFiles(max_files, total=True)

    def _process_file(
        self,
        user_id: str,
        incoming: IncomingFile,
        max_bytes: int,
        max_mb: int,
        ova_id: str | None,
    ) -> UploadItemView:
        mime = (incoming.content_type or "").strip().lower()
        if not is_allowed_mime(mime):
            raise MimeNotAllowed()
        if len(incoming.content) > max_bytes:
            raise FileTooLarge(max_mb)
        if not magic_bytes_ok(mime, incoming.content):
            raise ContentMismatch()

        upload = self.repo.create(
            user_id, safe_filename(incoming.filename), mime, incoming.content, ova_id=ova_id
        )
        rag_status = _RAG_PROCESSING if self.rag.is_enabled() else _RAG_DISABLED
        self.repo.set_rag_status(upload.upload_id, rag_status.as_dict())
        return to_view(upload, rag_status=rag_status.as_dict())
