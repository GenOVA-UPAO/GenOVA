from fastapi import APIRouter

from llm.phases.elaborate_router import router as elaborate_router
from llm.phases.engage_router import router as engage_router
from llm.phases.evaluate_router import router as evaluate_router
from llm.phases.explain_router import router as explain_router
from llm.phases.explore_router import router as explore_router

router = APIRouter()
router.include_router(engage_router, prefix="/engage", tags=["Agentes 5E"])
router.include_router(explore_router, prefix="/explore", tags=["Agentes 5E"])
router.include_router(explain_router, prefix="/explain", tags=["Agentes 5E"])
router.include_router(elaborate_router, prefix="/elaborate", tags=["Agentes 5E"])
router.include_router(evaluate_router, prefix="/evaluate", tags=["Agentes 5E"])


@router.get("/health", tags=["Health"], summary="Estado del módulo de agentes")
def agents_health() -> dict[str, str]:
    return {"module": "agents", "status": "ok"}
