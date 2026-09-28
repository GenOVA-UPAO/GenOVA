"""Dominio de subidas temporales (arquitectura hexagonal).

Router HTTP: `uploads.interface.http.router`. API pública para otros dominios:
errores y `TempUpload` de `uploads.domain`.
"""

from uploads.domain import TempUpload, UploadError  # noqa: F401


def claim_uploads(user_id: str, upload_ids: list[str], ova_id: str) -> list:
    """Da por usadas las subidas del usuario y las liga al OVA (salen de su lista
    temporal). Devuelve las vistas (`UploadItemView`) de las reclamadas.

    Import perezoso: el contenedor arrastra FastAPI y la sesión de BD, y este
    paquete lo importan dominios que solo quieren los tipos."""
    from uploads.container import claim_uploads as _claim

    return _claim(user_id, upload_ids, ova_id)


def uploads_owned_by(user_id: str, upload_ids: list[str]) -> list[str]:
    """Subconjunto de `upload_ids` que son subidas temporales del usuario."""
    from uploads.container import uploads_owned_by as _owned

    return _owned(user_id, upload_ids)


__all__ = ["TempUpload", "UploadError", "claim_uploads", "uploads_owned_by"]
