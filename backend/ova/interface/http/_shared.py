import contextlib
import os

from pydantic import BaseModel, Field

from models import Ova
from ova.application.access import _is_admin as _is_admin

VALID_STATUSES = {"borrador", "generando", "listo", "error"}


def _ova_to_dict(
    ova: Ova, include_owner: bool = False, active_version_number: int | None = None
) -> dict:
    """`active_version_number` permite pasar el número ya resuelto por SQL (listado
    paginado) y evitar el eager-load de la colección `versions`, que duplicaba filas
    e impedía fusionar el COUNT con la consulta de página."""
    if active_version_number is None and ova.versions:
        # Fallback (HU-030): versiones ya cargadas en memoria por el llamador.
        for v in ova.versions:
            if v.is_active:
                active_version_number = v.version_number
                break

    data = {
        "id": str(ova.id),
        "title": ova.title,
        "description": ova.description,
        "status": ova.status,
        "file_path": ova.file_path,
        "version_number": active_version_number,
        "created_at": ova.created_at.isoformat() if ova.created_at else None,
        "updated_at": ova.updated_at.isoformat() if ova.updated_at else None,
        "deleted_at": ova.deleted_at.isoformat() if ova.deleted_at else None,
    }
    if include_owner and ova.owner:
        data["owner"] = {
            "id": str(ova.owner.id),
            "full_name": ova.owner.full_name or ova.owner.email,
        }
    return data


def _delete_scorm_file(file_path: str | None) -> None:
    if file_path:
        with contextlib.suppress(FileNotFoundError):
            os.remove(file_path)


class BatchIdsRequest(BaseModel):
    ova_ids: list[str] = Field(min_length=1)


class UpdateOvaMetadataRequest(BaseModel):
    title: str
    description: str | None = None
