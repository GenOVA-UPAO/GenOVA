from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Estado del módulo SCORM")
def scorm_health() -> dict[str, str]:
    return {"module": "scorm", "status": "ok"}
