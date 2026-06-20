"""Admin user-management router. Mounts the listing, profile and account
sub-routers. Each sub-module stays focused so files stay under the 200-line
ceiling enforced project-wide."""

from fastapi import APIRouter

from users.admin.account_router import router as account_router
from users.admin.list_router import router as list_router
from users.admin.profile_router import router as profile_router

router = APIRouter()
router.include_router(list_router)
router.include_router(profile_router)
router.include_router(account_router)
