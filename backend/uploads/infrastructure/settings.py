"""Límites de subida leídos del entorno (implementa UploadLimits)."""

from __future__ import annotations

from uploads.infrastructure import in_memory_store as store


class EnvUploadLimits:
    def max_files_per_request(self) -> int:
        return store.max_files_per_request()

    def max_file_size_bytes(self) -> int:
        return store.max_file_size_bytes()

    def max_file_size_mb(self) -> int:
        return store.max_file_size_mb()
