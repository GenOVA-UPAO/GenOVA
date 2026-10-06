"""Export endpoints for an OVA's active version (SCORM 1.2 and the other formats)."""

import unicodedata
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse, JSONResponse, Response

from auth.dependencies import require_permission
from ova.application.dto import ExportOvaInput, PackageDownload
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["SCORM y descargas"])

EXPORT_FORMAT_IDS = "scorm12 | scorm2004 | ims | html | epub | elpx"


def _actor(current_user) -> OvaActor:
    return OvaActor(id=str(current_user.id), is_admin=bool(current_user.admin_flag_cached))


def _content_disposition(filename: str) -> str:
    """`attachment; filename="…"` (+ `filename*` RFC 5987 si hay caracteres no ASCII:
    las cabeceras HTTP van en latin-1)."""
    ascii_name = (
        unicodedata.normalize("NFKD", filename).encode("ascii", "ignore").decode("ascii")
    ).replace('"', "") or "ova"
    if ascii_name == filename:
        return f'attachment; filename="{filename}"'
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}"


def _download_response(result: PackageDownload):
    if result.kind == "url":
        return JSONResponse({"download_url": result.url, "filename": result.filename})
    if result.kind == "bytes":
        return Response(
            content=result.content or b"",
            media_type=result.media_type,
            headers={"Content-Disposition": _content_disposition(result.filename)},
        )
    return FileResponse(
        path=result.file_path,
        filename=result.filename,
        media_type=result.media_type,
    )


@router.get("/{ova_id}/export-scorm", summary="Exportar la OVA como paquete SCORM 1.2")
def export_scorm(
    ova_id: str,
    current_user=Depends(require_permission("export_ova")),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.export_package.execute(
            ExportOvaInput(ova_id=ova_id, actor=_actor(current_user), format="scorm12")
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _download_response(result)


@router.get("/{ova_id}/export", summary="Exportar la OVA en el formato indicado")
def export_package(
    ova_id: str,
    export_format: str = Query(
        "scorm12", alias="format", description=f"Formato: {EXPORT_FORMAT_IDS}"
    ),
    current_user=Depends(require_permission("export_ova")),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.export_package.execute(
            ExportOvaInput(ova_id=ova_id, actor=_actor(current_user), format=export_format)
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _download_response(result)
