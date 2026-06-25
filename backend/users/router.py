from fastapi import APIRouter

from users.admin.router import router as admin_router
from users.analytics.analytics_router import router as analytics_router
from users.settings.api_keys_router import router as api_keys_router
from users.settings.enabled_models_router import router as enabled_models_router
from users.settings.links_router import router as links_router
from users.settings.llm_settings_router import router as llm_settings_router
from users.settings.ova_settings_router import router as ova_settings_router
from users.settings.profile_router import router as profile_router
from users.settings.resource_configs_router import router as resource_configs_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(llm_settings_router)
router.include_router(enabled_models_router)
router.include_router(ova_settings_router)
router.include_router(api_keys_router)
router.include_router(links_router)
router.include_router(resource_configs_router)
router.include_router(analytics_router)
router.include_router(admin_router)
