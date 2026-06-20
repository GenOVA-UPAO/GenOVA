"""Shared helpers + schemas for edit_router phase-level write operations."""

from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Ova, OvaPhase, OvaVersion, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _resolve_ova,
)


class ReorderItem(BaseModel):
    phase_id: str
    new_order: int


class ReorderRequest(BaseModel):
    reorders: list[ReorderItem]


class SavePhaseRequest(BaseModel):
    content: str


def _check_ova_generating(ova: Ova) -> JSONResponse | None:
    """Return 409 Conflict if the OVA is being generated, else None."""
    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "ova_generating",
                "message": "No se puede editar mientras genera.",
            },
        )
    return None


def _get_or_create_active_version(ova: Ova, db: Session) -> OvaVersion:
    """Return the active version for *ova*, creating v1 if none exists."""
    ver = _get_active_version(str(ova.id), db)
    return ver if ver else _ensure_version_exists(ova, db)


def _get_phase(phase_id: str, version_id: str, db: Session) -> OvaPhase | None:
    """Look up a single phase by id within a specific version."""
    return db.execute(
        select(OvaPhase).where(OvaPhase.id == phase_id, OvaPhase.version_id == version_id)
    ).scalar_one_or_none()


def _list_phases(version_id: str, db: Session) -> list[OvaPhase]:
    """Return all phases for *version_id* ordered by phase_order."""
    return list(
        db.execute(
            select(OvaPhase).where(OvaPhase.version_id == version_id).order_by(OvaPhase.phase_order)
        )
        .scalars()
        .all()
    )


def _resolve_ova_and_version(
    ova_id: str, current_user: User, db: Session
) -> tuple[Ova | None, OvaVersion | None, JSONResponse | None]:
    """Resolve OVA, check owner + not generating, return active version.

    Returns ``(ova, version, error)``.  If *error* is truthy the caller must
    return it immediately; *ova* and *version* are ``None`` in that case.
    """
    ova, err = _resolve_ova(ova_id, current_user, db)
    if err:
        return None, None, err
    if gen_err := _check_ova_generating(ova):
        return None, None, gen_err
    return ova, _get_or_create_active_version(ova, db), None


def _create_new_version(
    ova: Ova,
    active_version: OvaVersion,
    phases_data: list[dict],
    db: Session,
) -> OvaVersion:
    """Deactivate *active_version*, create a new version with the given phases.

    *phases_data* is a list of ``{"type":..., "order":..., "content":...}``
    dicts.  Caller must ``commit_or_500`` after this returns.
    """
    active_version.is_active = False

    new_version = OvaVersion(
        ova_id=ova.id,
        version_number=active_version.version_number + 1,
        prompt=active_version.prompt,
        is_active=True,
    )
    db.add(new_version)
    db.flush()

    for pd in phases_data:
        db.add(
            OvaPhase(
                version_id=new_version.id,
                phase_type=pd["type"],
                phase_order=pd["order"],
                content=pd["content"],
                regenerated=pd.get("regenerated", False),
            )
        )

    db.flush()
    return new_version
