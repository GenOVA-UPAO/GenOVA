import contextlib
import os

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova, Role, User, UserRole

VALID_STATUSES = {"borrador", "generando", "listo", "error"}


def _is_admin(user: User, db: Session) -> bool:
    result = db.execute(
        select(UserRole).join(Role).where(UserRole.user_id == user.id, Role.name == "administrador")
    ).scalar_one_or_none()
    return result is not None


def _ova_to_dict(ova: Ova, include_owner: bool = False) -> dict:
    # Find active version number when versions are already eager-loaded (HU-030).
    active_version_number: int | None = None
    if ova.versions:
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
