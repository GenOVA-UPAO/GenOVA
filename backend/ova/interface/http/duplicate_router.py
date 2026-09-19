from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import DuplicateOvaInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · CRUD"])

@router.post("/{ova_id}/duplicar", status_code=201, summary="Duplicar una OVA")
@limiter.limit("10/minute")
def duplicate_ova(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.duplicate_ova.execute(
            DuplicateOvaInput(
                ova_id=ova_id,
                actor=OvaActor(
                    id=str(current_user.id),
                    is_admin=bool(current_user.admin_flag_cached),
                ),
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return JSONResponse(
        status_code=201,
        content={
            "id": result.id,
            "title": result.title,
            "status": "borrador",
            "message": "OVA duplicado correctamente.",
            "edit_url": f"/ova/{result.id}/workspace",
        },
    )
