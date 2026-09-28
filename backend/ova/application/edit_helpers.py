import os

from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.http_errors import forbidden_response
from core.ids import is_uuid
from models import Ova, OvaPhase, OvaVersion, User
from ova.application.access import _is_admin


def _ova_output_dir() -> str:
    default = os.path.join(os.path.dirname(__file__), "..", "scorm_output")
    return os.getenv("OVA_OUTPUT_DIR") or default


def _is_ova_owner(ova: Ova, user: User) -> bool:
    return str(ova.user_id) == str(user.id)


def _get_active_version(ova_id, db: Session) -> OvaVersion | None:
    return db.execute(
        select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
    ).scalar_one_or_none()


def _ensure_version_exists(ova: Ova, db: Session) -> OvaVersion:
    """Creates a v1 version for OVAs that pre-date the versioning feature."""
    from scorm import DEFAULT_PHASES

    version = OvaVersion(
        ova_id=ova.id,
        version_number=1,
        prompt=ova.description or ova.title,
        is_active=True,
    )
    db.add(version)
    db.flush()

    for phase_data in DEFAULT_PHASES:
        db.add(
            OvaPhase(
                version_id=version.id,
                phase_type=phase_data["type"],
                phase_order=phase_data["order"],
                content=phase_data["content"],
                regenerated=False,
            )
        )

    ova.current_version_id = version.id
    db.commit()
    db.refresh(version)
    return version


def _phase_to_dict(phase: OvaPhase) -> dict:
    return {
        "id": str(phase.id),
        "phase_type": phase.phase_type,
        "phase_order": phase.phase_order,
        "content": phase.content,
        "regenerated": phase.regenerated,
        "resource_type_id": phase.resource_type_id,
        "title": phase.title,
    }


def _version_to_dict(version: OvaVersion, include_phases: bool = False) -> dict:
    data = {
        "id": str(version.id),
        "version_number": version.version_number,
        "prompt": version.prompt,
        "is_active": version.is_active,
        "created_at": version.created_at.isoformat() if version.created_at else None,
    }
    if include_phases:
        data["phases"] = [_phase_to_dict(p) for p in version.phases]
    return data


def _resolve_ova(ova_id: str, current_user: User, db: Session):
    """Fetch a non-deleted OVA and verify the requesting user owns it (or is admin).

    Returns ``(ova, None)`` on success, or ``(None, JSONResponse)`` on error.
    Callers should ``return err`` immediately when the second element is truthy.
    """
    ova = (
        db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
        ).scalar_one_or_none()
        if is_uuid(ova_id)
        else None
    )
    if not ova:
        return None, JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )
    if not _is_ova_owner(ova, current_user) and not _is_admin(current_user, db):
        return None, forbidden_response()
    return ova, None


def _load_version_with_phases(version_id: str, ova_id: str, db: Session) -> dict | None:
    """Load a version and its phases for side-by-side diff comparison.

    Returns ``{"version": ..., "phases": [...]}`` or ``None`` if not found.
    An id that is not a UUID is treated as "not found" instead of reaching the DB.
    """
    if not is_uuid(version_id) or not is_uuid(ova_id):
        return None
    ver = db.execute(
        select(OvaVersion).where(OvaVersion.id == version_id, OvaVersion.ova_id == ova_id)
    ).scalar_one_or_none()
    if not ver:
        return None
    phases = (
        db.execute(
            select(OvaPhase).where(OvaPhase.version_id == version_id).order_by(OvaPhase.phase_order)
        )
        .scalars()
        .all()
    )
    return {
        "version": _version_to_dict(ver),
        "phases": [_phase_to_dict(p) for p in phases],
    }
