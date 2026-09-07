from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from generation.regen.regen_router import router as regen_router
from ova.application.dto import PhaseContentInput, PhaseReorder, ReorderPhasesInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.edit_view_router import router as edit_view_router
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter()


class ReorderItem(BaseModel):
    phase_id: str
    new_order: int


class ReorderRequest(BaseModel):
    reorders: list[ReorderItem]


class SavePhaseRequest(BaseModel):
    content: str


def _actor(current_user) -> OvaActor:
    return OvaActor(id=str(current_user.id), is_admin=bool(current_user.admin_flag_cached))


@router.patch("/{ova_id}/fases/reorder", tags=["OVA · Fases y versiones"], summary="Reordenar fases")
@limiter.limit("20/minute")
def reorder_phases(
    request: Request,
    ova_id: str,
    payload: ReorderRequest,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        reordered = use_cases.edit_phases.reorder(
            ReorderPhasesInput(
                ova_id=ova_id,
                actor=_actor(current_user),
                reorders=tuple(
                    PhaseReorder(phase_id=item.phase_id, new_order=item.new_order)
                    for item in payload.reorders
                ),
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {"message": "Orden actualizado.", "reordered": reordered}


@router.delete(
    "/{ova_id}/fases/{fase_id}", tags=["OVA · Fases y versiones"], summary="Eliminar una fase"
)
@limiter.limit("20/minute")
def delete_phase(
    request: Request,
    ova_id: str,
    fase_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        version = use_cases.edit_phases.delete(
            PhaseContentInput(ova_id=ova_id, phase_id=fase_id, actor=_actor(current_user), content="")
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {
        "new_version_number": version.version_number,
        "version_id": version.id,
        "message": f"Fase eliminada. Nueva versión v{version.version_number} creada.",
    }


@router.patch(
    "/{ova_id}/fases/{fase_id}",
    tags=["OVA · Fases y versiones"],
    summary="Guardar los cambios de una fase",
)
@limiter.limit("30/minute")
def save_phase(
    request: Request,
    ova_id: str,
    fase_id: str,
    payload: SavePhaseRequest,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        version = use_cases.edit_phases.save(
            PhaseContentInput(
                ova_id=ova_id,
                phase_id=fase_id,
                actor=_actor(current_user),
                content=payload.content,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {
        "new_version_number": version.version_number,
        "version_id": version.id,
        "message": f"Fase guardada. Nueva versión v{version.version_number} creada.",
    }


router.include_router(regen_router)
router.include_router(edit_view_router)
