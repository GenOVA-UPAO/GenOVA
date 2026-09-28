"""Puerto de almacenamiento de ficheros (driven).

`storage/` es un adaptador outbound: no conoce HTTP ni ORM ni ningún dominio.
Los dominios (`ova`, `scorm`) dependen de este `FileStoragePort`, no de un
proveedor concreto.
"""

from __future__ import annotations

from typing import Protocol


class StorageError(RuntimeError):
    """Fallo de almacenamiento que el llamador debe manejar."""


class FileStoragePort(Protocol):
    def is_configured(self) -> bool: ...

    def upload_zip(self, object_key: str, zip_bytes: bytes) -> str: ...

    def signed_url(
        self,
        object_key: str,
        ttl_seconds: int = 3600,
        download_as: str | None = None,
    ) -> str: ...

    def delete_zip(self, object_key: str) -> None: ...
