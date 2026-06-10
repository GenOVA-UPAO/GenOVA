from fastapi import APIRouter

from llm.engage_router import router as engage_router
from llm.explore_router import router as explore_router

router = APIRouter()
router.include_router(engage_router, prefix="/engage", tags=["engage"])
router.include_router(explore_router, prefix="/explore", tags=["explore"])


@router.get("/health")
def agents_health() -> dict[str, str]:
    return {"module": "agents", "status": "ok"}
