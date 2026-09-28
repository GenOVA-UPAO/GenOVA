"""Adaptador Supabase Storage para la persistencia de los .zip SCORM.

El backend escribe los paquetes SCORM generados en un bucket privado de Supabase.
Las descargas se sirven con signed URLs de corta duración + redirección 302 — el
free tier de Render no puede proxear zips grandes en paralelo.

Si faltan `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, el adaptador funciona en
modo "desconfigurado": `is_configured()` devuelve False y los routers de OVA caen
a la persistencia en disco local (comportamiento legacy).
"""

from __future__ import annotations

import os
import threading

import structlog

from storage.port import FileStoragePort, StorageError

logger = structlog.get_logger(__name__)

DEFAULT_BUCKET = "scorm-packages"
DEFAULT_SIGNED_URL_TTL = 3600  # 1 hour


class SupabaseFileStorage(FileStoragePort):
    def __init__(self) -> None:
        self._client_lock = threading.Lock()
        self._client = None  # type: ignore[var-annotated]

    def _bucket_name(self) -> str:
        return os.getenv("SUPABASE_STORAGE_BUCKET", DEFAULT_BUCKET)

    def _clean_url(self) -> str:
        return (os.getenv("SUPABASE_URL") or "").strip()

    def _clean_key(self) -> str:
        return (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

    def is_configured(self) -> bool:
        """True solo si SUPABASE_URL es una https real y la service-role key no está
        vacía. Rechaza placeholders (`<tu-proyecto>...`) y hostnames pelados."""
        url = self._clean_url()
        key = self._clean_key()
        return bool(
            url
            and key
            and url.startswith(("http://", "https://"))
            and "<" not in url
            and ">" not in url
        )

    def _get_client(self):
        if self._client is not None:
            return self._client
        if not self.is_configured():
            raise StorageError("Supabase Storage is not configured (missing or invalid env vars).")
        with self._client_lock:
            if self._client is None:
                self._client = self._create_client()
        return self._client

    def _create_client(self):
        try:
            from supabase import create_client  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise StorageError("supabase-py is not installed.") from exc
        try:
            return create_client(self._clean_url(), self._clean_key())
        except Exception as exc:
            logger.exception("Supabase create_client falló")
            raise StorageError(f"Supabase client init failed: {exc}") from exc

    def upload_zip(self, object_key: str, zip_bytes: bytes) -> str:
        """Sube los bytes del zip al bucket. Sobrescribe si la clave ya existe."""
        client = self._get_client()
        try:
            client.storage.from_(self._bucket_name()).upload(
                path=object_key,
                file=zip_bytes,
                file_options={"content-type": "application/zip", "upsert": "true"},
            )
        except Exception as exc:
            logger.exception("Supabase upload falló", object_key=object_key)
            raise StorageError(f"Upload failed: {exc}") from exc
        return object_key

    def signed_url(
        self,
        object_key: str,
        ttl_seconds: int = DEFAULT_SIGNED_URL_TTL,
        download_as: str | None = None,
    ) -> str:
        """Signed URL de corta duración. `download_as` fija el Content-Disposition."""
        client = self._get_client()
        try:
            options = {"download": download_as} if download_as else None
            result = client.storage.from_(self._bucket_name()).create_signed_url(
                object_key, ttl_seconds, options=options
            )
        except Exception as exc:
            logger.exception("Supabase signed_url falló", object_key=object_key)
            raise StorageError(f"Signed URL generation failed: {exc}") from exc
        return self._extract_url(result)

    @staticmethod
    def _extract_url(result: object) -> str:
        # supabase-py devuelve {"signedURL": "..."} (algunas versiones "signedUrl").
        url = (
            result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")
            if isinstance(result, dict)
            else None
        )
        if not url:
            raise StorageError(f"Signed URL response missing url field: {result!r}")
        return url

    def delete_zip(self, object_key: str) -> None:
        """Best-effort: loguea y traga errores — no bloquear el borrado de OVA."""
        try:
            client = self._get_client()
            client.storage.from_(self._bucket_name()).remove([object_key])
        except Exception:
            logger.exception("Supabase delete falló", object_key=object_key)
