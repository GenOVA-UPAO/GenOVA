import logging

from fastapi import APIRouter

from ova.generation_router import router as gen_router, _enabled_llm_options

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def ova_health() -> dict[str, str]:
    return {"module": "ova", "status": "ok"}


@router.get("/llm-options")
def list_llm_options() -> dict[str, list[dict]]:
    return {"items": _enabled_llm_options()}


router.include_router(gen_router)
