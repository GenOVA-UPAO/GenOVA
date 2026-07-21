import contextlib
import os

from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova, Role, User, UserRole

VALID_STATUSES = {"borrador", "generando", "listo", "error"}


def forbidden_response(message: str = "Sin permisos.") -> JSONResponse:
    """403 envelope compartido — el mismo JSON estaba repetido verbatim en 10+ routers."""
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"error": "forbidden", "message": message},
    )


def _is_admin(user: User, db: Session) -> bool:
    """El rol ya viene resuelto por `get_current_user` en su consulta única; se
    reutiliza esa bandera para no repetir el JOIN en cada uno de los 14 llamadores
    (un round-trip menos por petición contra el pooler remoto, RN-001)."""
    cached = getattr(user, "admin_flag_cached", None)
    if cached is not None:
        return bool(cached)
    result = db.execute(
        select(UserRole).join(Role).where(UserRole.user_id == user.id, Role.name == "administrador")
    ).scalar_one_or_none()
    return result is not None


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
