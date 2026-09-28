from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import VersionInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response
from ova.interface.http.export_router import router as export_router

router = APIRouter()
# SCORM export endpoint lives in export_router; included here to keep its path.
router.include_router(export_router)


def _input(ova_id: str, version_id: str, current_user) -> VersionInput:
    return VersionInput(
        ova_id=ova_id,
        version_id=version_id,
        actor=OvaActor(id=str(current_user.id), is_admin=bool(current_user.admin_flag_cached)),
    )


@router.get("/{ova_id}/editar", tags=["OVA · CRUD"], summary="Obtener la OVA para el editor")
def get_ova_editor(
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        return use_cases.edit_view.editor(_input(ova_id, "", current_user))
    except OvaError as error:
        return ova_error_to_response(error)


@router.get(
    "/{ova_id}/versiones",
    tags=["OVA · Fases y versiones"],
    summary="Listar las versiones de la OVA",
)
def list_ova_versions(
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        return use_cases.edit_view.versions(_input(ova_id, "", current_user))
    except OvaError as error:
        return ova_error_to_response(error)


@router.post(
    "/{ova_id}/versiones/{version_id}/revert",
    tags=["OVA · Fases y versiones"],
    summary="Revertir la OVA a una versión anterior",
)
@limiter.limit("10/minute")
def revert_to_version(
    request: Request,
    ova_id: str,
    version_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        version = use_cases.edit_view.revert(_input(ova_id, version_id, current_user))
    except OvaError as error:
        return ova_error_to_response(error)
    return {
        "version_number": version.version_number,
        "version_id": version.id,
        "message": f"Revertido a v{version.version_number}.",
    }


@router.get(
    "/{ova_id}/versiones/diff",
    tags=["OVA · Fases y versiones"],
    summary="Comparar dos versiones de la OVA",
)
def get_version_diff(
    ova_id: str,
    v1: str,
    v2: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        return use_cases.edit_view.diff(_input(ova_id, v1, current_user), v2)
    except OvaError as error:
        return ova_error_to_response(error)
