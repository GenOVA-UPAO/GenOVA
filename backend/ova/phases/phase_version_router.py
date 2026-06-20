"""HU-029 — micro-versioning per phase: list + revert minor versions.

When a phase is saved/regenerated, a micro-version record is created externally.
This router exposes:
  GET  /{ova_id}/fases/{fase_id}/versiones  — list all micro-versions
  POST /{ova_id}/fases/{fase_id}/versiones/{mvid}/revert — restore a minor version
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from models import Ova, OvaPhase, OvaPhaseVersion, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
)
from users.admin.helpers import commit_or_500

router = APIRouter()


def _next_minor(db: Session, phase_id, ova_id) -> int:
    result = db.execute(
        select(func.max(OvaPhaseVersion.minor_number)).where(
            OvaPhaseVersion.phase_id == phase_id,
            OvaPhaseVersion.ova_id == ova_id,
        )
    ).scalar()
    return (result or 0) + 1


def record_phase_micro_version(db: Session, phase_id, ova_id: str, content: str) -> OvaPhaseVersion:
    """Call after saving a phase to record a micro-version entry."""
    minor = _next_minor(db, phase_id, ova_id)
    mv = OvaPhaseVersion(
        phase_id=phase_id,
        ova_id=ova_id,
        minor_number=minor,
        content=content,
    )
    db.add(mv)
    return mv


@router.get("/{ova_id}/fases/{fase_id}/versiones")
def list_phase_versions(
    ova_id: str,
    fase_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=404, content={"error": "not_found", "message": "OVA no encontrado."}
        )

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=403, content={"error": "forbidden", "message": "Sin permisos."}
        )

    mvs = (
        db.execute(
            select(OvaPhaseVersion)
            .where(OvaPhaseVersion.phase_id == fase_id, OvaPhaseVersion.ova_id == ova_id)
            .order_by(OvaPhaseVersion.minor_number.desc())
        )
        .scalars()
        .all()
    )

    return {
        "phase_id": fase_id,
        "micro_versions": [
            {
                "id": str(mv.id),
                "minor_number": mv.minor_number,
                "content": mv.content,
                "created_at": mv.created_at.isoformat() if mv.created_at else None,
            }
            for mv in mvs
        ],
    }


@router.post("/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert")
@limiter.limit("10/minute")
def revert_phase_version(
    request: Request,
    ova_id: str,
    fase_id: str,
    mvid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=404, content={"error": "not_found", "message": "OVA no encontrado."}
        )

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=403, content={"error": "forbidden", "message": "Sin permisos."}
        )

    mv = db.execute(
        select(OvaPhaseVersion).where(
            OvaPhaseVersion.id == mvid, OvaPhaseVersion.phase_id == fase_id
        )
    ).scalar_one_or_none()

    if not mv:
        return JSONResponse(
            status_code=404,
            content={"error": "not_found", "message": "Micro-versión no encontrada."},
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    phase = db.execute(
        select(OvaPhase).where(OvaPhase.id == fase_id, OvaPhase.version_id == active_version.id)
    ).scalar_one_or_none()

    if not phase:
        return JSONResponse(
            status_code=404,
            content={
                "error": "phase_not_found",
                "message": "Fase no encontrada en versión activa.",
            },
        )

    phase.content = mv.content
    record_phase_micro_version(db, phase.id, ova_id, mv.content)
    commit_or_500(db, op="revert_phase_version")

    return {
        "message": f"Fase revertida a micro-versión {mv.minor_number}.",
        "minor_number": mv.minor_number,
    }
