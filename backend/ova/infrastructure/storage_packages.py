"""Adaptador de descarga SCORM: URL firmada con caída a disco."""

from __future__ import annotations

import os

import structlog

from storage import StorageError, is_configured, signed_url

logger = structlog.get_logger(__name__)


class StoragePackageSource:
    def try_signed_url(self, storage_key: str | None, filename: str) -> str | None:
        if not storage_key or not is_configured():
            return None
        try:
            return signed_url(str(storage_key), download_as=filename)
        except StorageError:
            logger.exception("signed url failed, falling back to disk")
            return None

    def disk_available(self, file_path: str | None) -> bool:
        return bool(file_path and os.path.exists(file_path))
