"""HU-032 — Add a new resource (OvaPhase) to a phase of the OVA.

Business rules:
  - Max 4 resources per phase_type (R1)
  - Content generated from user prompt (simulated in non-LLM mode)
  - Records micro-version v1 for the new phase (HU-029 integration)
  - Rate-limited, commit_or_500, services → router pattern
"""

import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, User
from ova.crud.edit_helpers import (
    _ensure_version_exists,
    _get_active_version,
    _is_ova_owner,
    _phase_to_dict,
)
from ova.phases.phase_version_router import record_phase_micro_version
from rate_limit import limiter
from users.admin.helpers import commit_or_500

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_PHASES_PER_TYPE = 4

_PLACEHOLDER_CONTENT = (
    "Este recurso fue creado mediante prompt y está pendiente de regeneración.\n"
    "Usa 'Regenerar' con tu prompt para generar el contenido real."
)


def _count_phases_of_type(db: Session, version_id, phase_type: str) -> int:
    result = db.execute(
        select(func.count(OvaPhase.id)).where(
            OvaPhase.version_id == version_id,
            OvaPhase.phase_type == phase_type,
        )
    ).scalar()
    return result or 0


def _next_phase_order(db: Session, version_id, phase_type: str) -> int:
    result = db.execute(
        select(func.max(OvaPhase.phase_order)).where(
            OvaPhase.version_id == version_id,
            OvaPhase.phase_type == phase_type,
        )
    ).scalar()
    return (result or 0) + 1


class AddPhaseRequest(BaseModel):
    phase_type: str
    prompt: str


@router.post("/{ova_id}/fases")
@limiter.limit("5/minute")
def add_phase(
    request: Request,
    ova_id: str,
    payload: AddPhaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.phase_type.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_type", "message": "El tipo de fase no puede estar vacío."},
        )

    if not payload.prompt.strip():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "prompt_required", "message": "El prompt no puede estar vacío."},
        )

    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "OVA no encontrado."},
        )

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": "forbidden", "message": "Sin permisos."},
        )

    if ova.status == "generando":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "ova_generating", "message": "No se puede editar mientras genera."},
        )

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        active_version = _ensure_version_exists(ova, db)

    existing_count = _count_phases_of_type(db, active_version.id, payload.phase_type)
    if existing_count >= MAX_PHASES_PER_TYPE:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "max_phases_reached",
                "message": f"La fase '{payload.phase_type}' ya tiene el máximo de {MAX_PHASES_PER_TYPE} recursos.",
            },
        )

    next_order = _next_phase_order(db, active_version.id, payload.phase_type)
    content = f"[Generado con prompt: {payload.prompt.strip()}]\n\n{_PLACEHOLDER_CONTENT}"

    new_phase = OvaPhase(
        version_id=active_version.id,
        phase_type=payload.phase_type,
        phase_order=next_order,
        content=content,
        regenerated=False,
    )
    db.add(new_phase)
    db.flush()

    record_phase_micro_version(db, new_phase.id, ova_id, content)
    commit_or_500(db, op="add_phase")

    logger.info("Added phase %s to OVA %s (version %s)", new_phase.id, ova_id, active_version.id)

    return {
        "message": f"Recurso añadido a la fase '{payload.phase_type}'.",
        "phase": _phase_to_dict(new_phase),
    }
