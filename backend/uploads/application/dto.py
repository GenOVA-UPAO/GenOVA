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
    status: str
    chunks: int = 0
    message: str | None = None

    def as_dict(self) -> dict:
        data: dict = {"status": self.status, "chunks": self.chunks}
        if self.message is not None:
            data["message"] = self.message
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
