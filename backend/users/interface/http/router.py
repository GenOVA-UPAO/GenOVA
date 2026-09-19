from fastapi import APIRouter

from users.interface.http.admin_router import router as admin_router
from users.interface.http.analytics_router import router as analytics_router
from users.interface.http.settings_api_keys_router import router as api_keys_router
from users.interface.http.settings_enabled_models_router import router as enabled_models_router
from users.interface.http.settings_links_admin_router import router as links_admin_router
from users.interface.http.settings_links_router import router as links_router
from users.interface.http.settings_llm_settings_router import router as llm_settings_router
from users.interface.http.settings_ova_settings_router import router as ova_settings_router
from users.interface.http.settings_profile_router import router as profile_router
from users.interface.http.settings_resource_configs_router import router as resource_configs_router

router = APIRouter()

router.include_router(profile_router)
router.include_router(llm_settings_router)
router.include_router(enabled_models_router)
router.include_router(ova_settings_router)
router.include_router(api_keys_router)
router.include_router(links_router)
router.include_router(links_admin_router)
router.include_router(resource_configs_router)
router.include_router(analytics_router)
router.include_router(admin_router)
