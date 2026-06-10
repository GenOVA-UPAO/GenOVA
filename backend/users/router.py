from fastapi import APIRouter

from users.admin.router import router as admin_router
from users.enabled_models_router import router as enabled_models_router
from users.llm_settings_router import router as llm_settings_router
from users.profile_router import router as profile_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(llm_settings_router)
router.include_router(enabled_models_router)
router.include_router(admin_router)
