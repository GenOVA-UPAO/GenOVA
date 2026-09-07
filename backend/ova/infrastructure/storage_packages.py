"""Adaptador de descarga SCORM: URL firmada con caída a disco."""

from __future__ import annotations

import os

import structlog

from storage import StorageError, is_configured, signed_url

logger = structlog.get_logger(__name__)


class StoragePackageSource:
    def try_signed_url(
        self,
        storage_key: str | None,
        filename: str | None = None,
        ova_id: str | None = None,
    ) -> str | None:
        if not storage_key or not is_configured():
            return None
        try:
            if filename:
                return signed_url(str(storage_key), download_as=filename)
            return signed_url(str(storage_key))
        except StorageError:
            if ova_id is None:
                logger.exception("signed url failed, falling back to disk")
            else:
                logger.exception("signed url failed, falling back to disk", ova_id=ova_id)
            return None

    def disk_available(self, file_path: str | None) -> bool:
        return bool(file_path and os.path.exists(file_path))
