"""HU-031 — Granular sub-element editing within a phase resource.

Returns 501 Not Implemented for phase types that don't yet support
sub-element extraction. This is the pragmatic fallback as defined in the spec
(R4: acotar a lo viable). When the LLM can reliably splice a fragment,
upgrade this endpoint to actually call the regen service with the sub-element
context instead of returning 501.
"""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from models import Ova, OvaPhase, User
from ova.edit_helpers import _get_active_version, _is_ova_owner
from rate_limit import limiter

router = APIRouter()

# Phase types that support granular sub-element editing (none yet — future work)
_SUPPORTED_TYPES: set[str] = set()


class SubelementEditRequest(BaseModel):
    subelement_id: str
    prompt: str


@router.patch("/{ova_id}/fases/{fase_id}/subelementos/{sub_id}")
@limiter.limit("5/minute")
def edit_subelement(
    request: Request,
    ova_id: str,
    fase_id: str,
    sub_id: str,
    payload: SubelementEditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ova = db.execute(
        select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not ova:
        return JSONResponse(status_code=404, content={"error": "not_found", "message": "OVA no encontrado."})

    if not _is_ova_owner(ova, current_user):
        return JSONResponse(status_code=403, content={"error": "forbidden", "message": "Sin permisos."})

    active_version = _get_active_version(ova_id, db)
    if not active_version:
        return JSONResponse(status_code=404, content={"error": "no_version", "message": "Sin versión activa."})

    phase = db.execute(
        select(OvaPhase).where(OvaPhase.id == fase_id, OvaPhase.version_id == active_version.id)
    ).scalar_one_or_none()

    if not phase:
        return JSONResponse(status_code=404, content={"error": "phase_not_found", "message": "Fase no encontrada."})

    if phase.phase_type not in _SUPPORTED_TYPES:
        return JSONResponse(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            content={
                "error": "not_supported",
                "message": f"La edición granular no está disponible para la fase '{phase.phase_type}' aún.",
            },
        )

    # Future: extract sub_id fragment, call LLM with context, splice result back
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"error": "not_implemented", "message": "Edición granular en desarrollo."},
    )
