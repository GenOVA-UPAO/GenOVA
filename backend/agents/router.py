from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def agents_health() -> dict[str, str]:
    return {"module": "agents", "status": "ok"}
