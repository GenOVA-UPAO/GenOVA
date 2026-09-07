"""Entidades del dominio de subidas temporales."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TempUpload:
    upload_id: str
    user_id: str
    filename: str
    content_type: str
    size_bytes: int
    storage_path: str
    created_at: float
    expires_at: float
    confirmed_at: float | None = None
    rag_status: dict | None = None
