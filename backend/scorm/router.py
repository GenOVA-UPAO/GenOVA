from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def scorm_health() -> dict[str, str]:
    return {"module": "scorm", "status": "ok"}
