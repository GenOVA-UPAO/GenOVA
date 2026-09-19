"""HU-029 — micro-versioning per phase: list + revert minor versions."""

from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import PhaseVersionInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · Fases y versiones"])


def _input(ova_id: str, fase_id: str, current_user, micro_version_id: str = "") -> PhaseVersionInput:
    return PhaseVersionInput(
        ova_id=ova_id,
        phase_id=fase_id,
        actor=OvaActor(id=str(current_user.id), is_admin=bool(current_user.admin_flag_cached)),
        micro_version_id=micro_version_id,
    )


@router.get("/{ova_id}/fases/{fase_id}/versiones", summary="Listar las versiones de una fase")
def list_phase_versions(
    ova_id: str,
    fase_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        return use_cases.phase_versions.list(_input(ova_id, fase_id, current_user))
    except OvaError as error:
        return ova_error_to_response(error)


@router.post(
    "/{ova_id}/fases/{fase_id}/versiones/{mvid}/revert",
    summary="Revertir una fase a una versión anterior",
)
@limiter.limit("10/minute")
def revert_phase_version(
    request: Request,
    ova_id: str,
    fase_id: str,
    mvid: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        return use_cases.phase_versions.revert(_input(ova_id, fase_id, current_user, mvid))
    except OvaError as error:
        return ova_error_to_response(error)
