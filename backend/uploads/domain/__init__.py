"""Núcleo de dominio de subidas temporales."""

from uploads.domain.errors import (
    ContentMismatch,
    FileTooLarge,
    FilesRequired,
    MimeNotAllowed,
    TooManyFiles,
    UploadError,
    UploadNotFound,
)
from uploads.domain.model import TempUpload
from uploads.domain.policies import (
    ALLOWED_MIME_TYPES,
    is_allowed_mime,
    magic_bytes_ok,
    safe_filename,
)

__all__ = [
    "ALLOWED_MIME_TYPES",
    "ContentMismatch",
    "FileTooLarge",
    "FilesRequired",
    "MimeNotAllowed",
    "TempUpload",
    "TooManyFiles",
    "UploadError",
    "UploadNotFound",
    "is_allowed_mime",
    "magic_bytes_ok",
    "safe_filename",
]
