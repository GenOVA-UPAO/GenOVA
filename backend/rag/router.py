from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def rag_health() -> dict[str, str]:
    return {"module": "rag", "status": "ok"}
