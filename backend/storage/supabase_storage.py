"""Supabase Storage wrapper for SCORM zip persistence.

The backend writes generated SCORM packages to a private Supabase bucket. Downloads
are served by issuing short-lived signed URLs and 302-redirecting the client to
them — Render free tier cannot proxy large zips concurrently.

If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are missing, the module operates
in a degraded "disabled" mode where `is_configured()` returns False and the OVA
routers fall back to local-disk persistence (legacy behavior).
"""
from __future__ import annotations

import logging
import os
import threading
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_BUCKET = "scorm-packages"
DEFAULT_SIGNED_URL_TTL = 3600  # 1 hour


class StorageError(RuntimeError):
    """Raised on any Supabase Storage failure that callers should handle."""


_client_lock = threading.Lock()
_client = None  # type: ignore[var-annotated]


def _bucket_name() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", DEFAULT_BUCKET)


def is_configured() -> bool:
    return bool(os.getenv("SUPABASE_URL")) and bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))


def _get_client():
    """Lazy-init the supabase-py client. Importing the library is deferred so the
    backend boots even when the dep is absent (degraded mode)."""
    global _client
    if _client is not None:
        return _client
    if not is_configured():
        raise StorageError("Supabase Storage is not configured (missing env vars).")

    with _client_lock:
        if _client is None:
            try:
                from supabase import create_client  # type: ignore
            except ImportError as exc:  # pragma: no cover
                raise StorageError("supabase-py is not installed.") from exc
            url = os.environ["SUPABASE_URL"]
            key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
            _client = create_client(url, key)
    return _client


def upload_zip(object_key: str, zip_bytes: bytes) -> str:
    """Upload SCORM zip bytes to the configured bucket. Returns the object_key on
    success. Overwrites if the key already exists (regeneration path)."""
    client = _get_client()
    bucket = _bucket_name()
    try:
        client.storage.from_(bucket).upload(
            path=object_key,
            file=zip_bytes,
            file_options={
                "content-type": "application/zip",
                "upsert": "true",
            },
        )
    except Exception as exc:
        logger.exception("Supabase upload failed for key=%s", object_key)
        raise StorageError(f"Upload failed: {exc}") from exc
    return object_key


def signed_url(object_key: str, ttl_seconds: int = DEFAULT_SIGNED_URL_TTL) -> str:
    """Generate a short-lived signed URL for download."""
    client = _get_client()
    bucket = _bucket_name()
    try:
        result = client.storage.from_(bucket).create_signed_url(object_key, ttl_seconds)
    except Exception as exc:
        logger.exception("Supabase signed_url failed for key=%s", object_key)
        raise StorageError(f"Signed URL generation failed: {exc}") from exc

    # supabase-py returns {"signedURL": "..."} (some versions {"signedUrl": "..."}).
    url: Optional[str] = (
        result.get("signedURL")
        or result.get("signedUrl")
        or result.get("signed_url")
        if isinstance(result, dict)
        else None
    )
    if not url:
        raise StorageError(f"Signed URL response missing url field: {result!r}")
    return url


def delete_zip(object_key: str) -> None:
    """Best-effort delete. Logs and swallows errors — callers should not block
    OVA deletion on storage cleanup."""
    try:
        client = _get_client()
        client.storage.from_(_bucket_name()).remove([object_key])
    except Exception:
        logger.exception("Supabase delete failed for key=%s", object_key)
