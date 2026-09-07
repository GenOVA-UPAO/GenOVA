"""Proyección de entidades de dominio a DTOs de salida."""

from __future__ import annotations

from uploads.application.dto import UploadItemView
from uploads.domain.model import TempUpload


def to_view(upload: TempUpload, rag_status: dict | None = None) -> UploadItemView:
    return UploadItemView(
        upload_id=upload.upload_id,
        filename=upload.filename,
        content_type=upload.content_type,
        size_bytes=upload.size_bytes,
        created_at=upload.created_at,
        expires_at=upload.expires_at,
        confirmed_at=upload.confirmed_at,
        rag_status=rag_status if rag_status is not None else upload.rag_status,
    )
