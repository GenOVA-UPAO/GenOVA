"""Adaptador HTTP para añadir recursos al editor de OVAs."""

import structlog
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import AddPhaseInput
from ova.container import OvaUseCases, build_ova
from ova.domain.editor import phase_to_dict
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

logger = structlog.get_logger(__name__)
router = APIRouter(tags=["OVA · Fases y versiones"])


class AddPhaseRequest(BaseModel):
    phase_type: str
    prompt: str


@router.post("/{ova_id}/fases", summary="Añadir una fase a la OVA")
@limiter.limit("5/minute")
def add_phase(
    request: Request,
    ova_id: str,
    payload: AddPhaseRequest,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        phase = use_cases.add_phase.execute(
            AddPhaseInput(
                ova_id=ova_id,
                actor=OvaActor(id=str(current_user.id), is_admin=bool(current_user.admin_flag_cached)),
                phase_type=payload.phase_type,
                prompt=payload.prompt,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    logger.info("phase added", phase_id=phase.id, ova_id=ova_id)
    return {
        "message": f"Recurso añadido a la fase '{payload.phase_type}'.",
        "phase": phase_to_dict(phase),
    }
