from fastapi import APIRouter

from llm.phases.elaborate_router import router as elaborate_router
from llm.phases.engage_router import router as engage_router
from llm.phases.evaluate_router import router as evaluate_router
from llm.phases.explain_router import router as explain_router
from llm.phases.explore_router import router as explore_router

router = APIRouter()
router.include_router(engage_router, prefix="/engage", tags=["engage"])
router.include_router(explore_router, prefix="/explore", tags=["explore"])
router.include_router(explain_router, prefix="/explain", tags=["explain"])
router.include_router(elaborate_router, prefix="/elaborate", tags=["elaborate"])
router.include_router(evaluate_router, prefix="/evaluate", tags=["evaluate"])


@router.get("/health", tags=["agents"])
def agents_health() -> dict[str, str]:
    return {"module": "agents", "status": "ok"}
