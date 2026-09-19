"""Adaptador outbound de almacenamiento de ficheros.

Superficie estable para que los dominios (`ova`, `scorm`) no importen el proveedor
directamente. `get_file_storage()` devuelve la implementación por defecto
(Supabase); las funciones de módulo delegan en ella y se conservan para los
llamadores existentes.
"""

from __future__ import annotations

from functools import lru_cache

from storage.port import FileStoragePort, StorageError
from storage.supabase import SupabaseFileStorage


@lru_cache(maxsize=1)
def get_file_storage() -> FileStoragePort:
    return SupabaseFileStorage()


def is_configured() -> bool:
    return get_file_storage().is_configured()


def upload_zip(object_key: str, zip_bytes: bytes) -> str:
    return get_file_storage().upload_zip(object_key, zip_bytes)


def signed_url(object_key: str, ttl_seconds: int = 3600, download_as: str | None = None) -> str:
    return get_file_storage().signed_url(object_key, ttl_seconds, download_as)


def delete_zip(object_key: str) -> None:
    get_file_storage().delete_zip(object_key)


__all__ = [
    "FileStoragePort",
    "StorageError",
    "SupabaseFileStorage",
    "delete_zip",
    "get_file_storage",
    "is_configured",
    "signed_url",
    "upload_zip",
]
