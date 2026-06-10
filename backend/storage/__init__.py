"""Cloud storage adapters. Currently only Supabase Storage is implemented; the
module exposes a stable surface so the OVA routers don't import the provider
directly."""
from storage.supabase_storage import (
    StorageError,
    delete_zip,
    is_configured,
    signed_url,
    upload_zip,
)

__all__ = [
    "StorageError",
    "delete_zip",
    "is_configured",
    "signed_url",
    "upload_zip",
]
