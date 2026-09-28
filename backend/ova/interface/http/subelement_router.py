"""HU-031 — Granular sub-element editing within a phase resource.

Returns 501 Not Implemented for phase types that don't yet support
sub-element extraction. This is the pragmatic fallback as defined in the spec
(R4: acotar a lo viable). When the LLM can reliably splice a fragment,
upgrade this endpoint to actually call the regen service with the sub-element
context instead of returning 501.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import SubelementEditInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · Fases y versiones"])


class SubelementEditRequest(BaseModel):
    subelement_id: str
    prompt: str


@router.patch(
    "/{ova_id}/fases/{fase_id}/subelementos/{sub_id}", summary="Editar un subelemento de una fase"
)
@limiter.limit("5/minute")
def edit_subelement(
    request: Request,
    ova_id: str,
    fase_id: str,
    sub_id: str,
    payload: SubelementEditRequest,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        use_cases.edit_subelement.execute(
            SubelementEditInput(
                ova_id=ova_id,
                phase_id=fase_id,
                subelement_id=payload.subelement_id or sub_id,
                actor=OvaActor(
                    id=str(current_user.id),
                    is_admin=bool(current_user.admin_flag_cached),
                ),
                prompt=payload.prompt,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return None
