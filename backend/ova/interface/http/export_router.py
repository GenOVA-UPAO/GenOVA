"""SCORM export endpoint for an OVA's active version."""

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, JSONResponse

from auth.dependencies import get_current_user
from ova.application.dto import ManageOvaInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["SCORM y descargas"])


@router.get("/{ova_id}/export-scorm", summary="Exportar la OVA como paquete SCORM 1.2")
def export_scorm(
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.export_scorm.execute(
            ManageOvaInput(
                ova_id=ova_id,
                actor=OvaActor(
                    id=str(current_user.id),
                    is_admin=bool(current_user.admin_flag_cached),
                ),
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    if result.kind == "url":
        return JSONResponse({"download_url": result.url, "filename": result.filename})
    return FileResponse(
        path=result.file_path,
        filename=result.filename,
        media_type="application/zip",
    )
