from fastapi import APIRouter, Response

from scorm.service import build_scorm_zip_bytes

router = APIRouter()


@router.get("/health")
def scorm_health() -> dict[str, str]:
    return {"module": "scorm", "status": "ok"}


@router.post("/export")
def export_scorm() -> Response:
    zip_bytes = build_scorm_zip_bytes()
    headers = {"Content-Disposition": 'attachment; filename="ova-scorm.zip"'}
    return Response(content=zip_bytes, media_type="application/zip", headers=headers)
