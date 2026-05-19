from fastapi import APIRouter

from users.admin_router import router as admin_router
from users.profile_router import router as profile_router

router = APIRouter()

router.include_router(admin_router)
router.include_router(profile_router)
