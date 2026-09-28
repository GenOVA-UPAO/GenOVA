"""DTOs de la capa de aplicación de subidas."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class IncomingFile:
    filename: str
    content_type: str
    content: bytes


@dataclass(frozen=True, slots=True)
class RagStatus:
    """Estado de indexado de un archivo para el RAG.

    `status`: processing (en cola o indexándose), indexed, skipped (no hay texto
    que indexar), failed / error (falló la ingesta) o disabled (RAG apagado).
    `reason` es el código técnico y `message` lo que se le enseña al docente."""

    status: str
    chunks: int = 0
    message: str | None = None
    reason: str | None = None

    def as_dict(self) -> dict:
        data: dict = {"status": self.status, "chunks": self.chunks}
        if self.message is not None:
            data["message"] = self.message
        if self.reason is not None:
            data["reason"] = self.reason
        return data


@dataclass(frozen=True, slots=True)
class UploadItemView:
    upload_id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: float
    expires_at: float
    confirmed_at: float | None = None
    rag_status: dict | None = None
    ova_id: str | None = None


@dataclass(frozen=True, slots=True)
class UploadFileError:
    filename: str
    error: str
    message: str


@dataclass(frozen=True, slots=True)
class UploadOutcome:
    items: list[UploadItemView] = field(default_factory=list)
    errors: list[UploadFileError] = field(default_factory=list)
    max_files: int = 0
    max_size_mb: int = 0
    # Ids que quedaron en `processing`: el adaptador HTTP los indexa en segundo
    # plano (IngestUpload) después de responder.
    pending_ingestion: list[str] = field(default_factory=list)
